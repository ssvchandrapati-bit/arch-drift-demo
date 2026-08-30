/**
 * agent.js
 *
 * - Loads .env for GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PR_NUMBER
 * - Fetches the raw diff for the PR
 * - Loads architecture_rules.md
 * - Calls a mock LLM evaluator that returns:
 *    { urgency: 1-5, drift: 'Yes'|'No', violatedRule, rationale, suggestion }
 * - Prints a Markdown report and optionally posts it as a PR comment
 *
 * Usage:
 *   node agent.js
 *   POST_COMMENT=1 node agent.js   # will post the report as a comment to PR (requires token + repo perms)
 */

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;
const PR_NUMBER = parseInt(process.env.PR_NUMBER || '', 10);
const POST_COMMENT = !!(process.env.POST_COMMENT && process.env.POST_COMMENT !== '0');

if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME || !PR_NUMBER) {
  console.error('Missing one of GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PR_NUMBER in .env');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function fetchPrDiff(owner, repo, prNumber) {
  try {
    // Use the Accept header for raw diff content
    const res = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner,
      repo,
      pull_number: prNumber,
      headers: {
        accept: 'application/vnd.github.v3.diff'
      }
    });
    // res.data will be the raw diff string
    return res.data;
  } catch (err) {
    throw new Error(`Failed to fetch PR diff: ${err.message} ${err.status || ''}`);
  }
}

function loadRulesFile(filePath = 'architecture_rules.md') {
  const full = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(full)) {
    throw new Error(`${filePath} not found in ${process.cwd()}. Create it before running.`);
  }
  return fs.readFileSync(full, 'utf8');
}

/**
 * Mock LLM evaluator
 *
 * Replace this with a real LLM call (OpenAI/Anthropic/etc.) as needed.
 *
 * Returns:
 * {
 *   urgency: 1..5,
 *   drift: 'Yes'|'No',
 *   violatedRule: string|null,
 *   rationale: string,
 *   suggestion: string
 * }
 */
function evaluateWithMockLLM(rulesText, diffText) {
  // Simple heuristics: look for DB access in controllers, raw SQL, direct service imports/calls
  const findings = [];
  const lowered = diffText.toLowerCase();

  // Detect direct DB usages
  const dbPatterns = [
    /client\.query\(/,
    /knex\(/,
    /sequelize/,
    /sequelize\./,
    /\bdb\./,
    /require\(['"].*db['"]\)/,
    /from\s+pg/,
    /raw sql/i,
    /query\(/,
  ];
  if (dbPatterns.some((re) => re.test(lowered))) {
    findings.push('Direct data-access pattern detected (raw SQL / db client usage).');
  }

  // Detect controllers by filename patterns (diff may include filenames)
  // Look for files with controller in path or route handlers using 'req,' or 'res,'
  if (/(controllers?|routes?)\//.test(lowered) || /function\s+\w*\s*\(req,\s*res\)/.test(lowered) || /req\./.test(lowered)) {
    findings.push('Changes touch controller/route handler code (handlers found).');
  }

  // Detect service-to-service direct calls (importing a service or calling billingService.)
  if (/\bservice(s)?\//.test(lowered) || /\.service\b/.test(lowered) || /billingservice|orderservice|paymentservice/.test(lowered) || /\.charge\(|\.refund\(|\.process\(/.test(lowered)) {
    findings.push('Possible direct cross-service function calls detected.');
  }

  // Determine severity and which rule violated
  let urgency = 1;
  let drift = 'No';
  let violatedRule = null;
  let rationale = 'No clear architectural violations detected from the diff using heuristic scan.';
  let suggestion = 'No major refactor suggested. Continue following repository architecture rules.';

  if (findings.length > 0) {
    drift = 'Yes';
    // If direct DB usage in controller or raw SQL => high severity
    const hasDb = dbPatterns.some((re) => re.test(lowered));
    const touchesController = /(controllers?|routes?)\//.test(lowered) || /function\s+\w*\s*\(req,\s*res\)/.test(lowered) || /req\./.test(lowered);

    if (hasDb && touchesController) {
      urgency = 5;
      violatedRule = 'Rule A — Controllers must not access the database directly';
      rationale = 'The diff contains database access patterns in files that appear to be controllers/handlers, coupling HTTP layer to persistence.';
      suggestion = 'Move data access into a repository/DAO and call it from a Service; keep controllers thin and only orchestrate input/output.';
    } else if (hasDb) {
      urgency = 4;
      violatedRule = 'Rule C — Data access must be funnelled through repository/DAO layers';
      rationale = 'Found direct DB client/SQL usage. Data access should be encapsulated in repository/DAO modules.';
      suggestion = 'Refactor queries into a repository module and replace direct DB calls with repository calls from services.';
    } else if (findings.some(f => f.includes('direct cross-service'))) {
      urgency = 3;
      violatedRule = 'Rule B — Services must communicate via events or well-defined interfaces';
      rationale = 'The diff includes usages that look like direct service-to-service calls; this increases coupling.';
      suggestion = 'Introduce an event or public API interface; have the calling service publish events that the other service subscribes to, or introduce a clearly defined public client.';
    } else {
      urgency = 3;
      violatedRule = 'Potential rule violation (needs reviewer confirmation)';
      rationale = findings.join(' ');
      suggestion = 'Request a human reviewer to inspect the diff and confirm whether the patterns are violations, or expand the agent rules to cover these cases.';
    }
  }

  // Return a structured object
  return {
    urgency,
    drift,
    violatedRule,
    rationale,
    suggestion,
    findings
  };
}

function buildMarkdownReport(prMeta, evaluation) {
  const header = `## Architectural Drift & Urgency Report\n\n**Repository:** ${REPO_OWNER}/${REPO_NAME}\n\n**PR:** #${PR_NUMBER} — ${prMeta.title || 'Untitled'}\n\n---\n`;
  const body = [
    `**Urgency Score (1-5):** ${evaluation.urgency}`,
    `**Architectural Drift Detected:** ${evaluation.drift}`,
    `**Violated Rule:** ${evaluation.violatedRule || 'None identified'}`,
    `**Rationale:**\n${evaluation.rationale}`,
    `**Suggested Refactoring:**\n${evaluation.suggestion}`,
  ].join('\n\n');

  const details = `\n\n---\n\n### Findings (heuristic)\n${(evaluation.findings && evaluation.findings.length) ? evaluation.findings.map(f => `- ${f}`).join('\n') : '- None found by heuristics.'}\n\n---\n\n*(This analysis was produced by an automated agent using the repository rules file. If this was a mock run, replace the mock evaluator with a real LLM for richer feedback.)*`;

  return header + body + details;
}

async function getPrMeta(owner, repo, prNumber) {
  try {
    const res = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
    return res.data;
  } catch (err) {
    console.warn('Could not fetch PR metadata:', err.message);
    return {};
  }
}

async function postCommentToPr(owner, repo, prNumber, body) {
  try {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body
    });
    console.log('Posted comment to PR.');
  } catch (err) {
    console.error('Failed to post comment to PR:', err.message);
  }
}

(async function main() {
  try {
    console.log('Loading rules file...');
    const rulesText = loadRulesFile('architecture_rules.md');

    console.log(`Fetching PR #${PR_NUMBER} diff from ${REPO_OWNER}/${REPO_NAME}...`);
    const diffText = await fetchPrDiff(REPO_OWNER, REPO_NAME, PR_NUMBER);

    console.log('Fetching PR metadata...');
    const prMeta = await getPrMeta(REPO_OWNER, REPO_NAME, PR_NUMBER);

    console.log('Running evaluation (mock LLM)...');
    // Replace evaluateWithMockLLM with a real LLM call if you have one configured.
    const evaluation = evaluateWithMockLLM(rulesText, diffText);

    const report = buildMarkdownReport(prMeta, evaluation);

    console.log('\n\n========== ARCHITECTURAL REPORT ==========\n');
    console.log(report);
    console.log('\n=========================================\n\n');

    if (POST_COMMENT) {
      console.log('Posting report as a PR comment...');
      await postCommentToPr(REPO_OWNER, REPO_NAME, PR_NUMBER, report);
    } else {
      console.log('POST_COMMENT not set; not posting to PR. To post the report set POST_COMMENT=1 and re-run.');
    }
  } catch (err) {
    console.error('Agent failed:', err.message);
    process.exit(1);
  }
})();

/*
  How to replace the mock evaluator with a real LLM:
  - Example (pseudo):
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    async function evaluateWithLLM(rulesText, diffText) {
      const systemPrompt = `You are an architecture reviewer. Given the following architecture rules and a PR diff,
      return JSON: {urgency:1-5, drift:"Yes"/"No", violatedRule:string|null, rationale:string, suggestion:string}.`;
      const input = `${systemPrompt}\n\nARCH RULES:\n${rulesText}\n\nPR DIFF:\n${diffText}`;
      const completion = await openai.createChatCompletion({...});
      // parse JSON from completion and return
    }
*/
