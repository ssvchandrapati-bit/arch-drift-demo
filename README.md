*Architectural Drift Guard with IBM Bob*

An automated, AI-driven architectural governance agent built for the IBM TechXchange Dev Day Hackathon.

Standard CI/CD linters catch syntax errors and formatting issues, but they are blind to high-level system topology breaches. Architectural Drift Guard continuously audits incoming GitHub Pull Requests against a plain-language architecture rules file, calculates an dynamic urgency score, flags structural drift, and leverages IBM Bob to automatically refactor violating code back into compliance.

Key Features
Continuous CI/CD Audit: Runs automatically via GitHub Actions whenever a Pull Request is opened or updated.

Topology-Aware Governance: Enforces high-level design boundaries (e.g., preventing API controllers from executing raw SQL or bypassing repository layers).

Dynamic Urgency Scoring: Assigns an Urgency Score (1 to 5) to prioritize dangerous architectural breaches over cosmetic PR updates.

Automated Fix Engine: Uses IBM Bob in an active closed-loop workflow to rewrite flagged code snippets into repository-compliant patterns.

Repository Structure
Plaintext
.
├── .github/
│   └── workflows/
│       └── arch-guard.yml      # GitHub Actions automation workflow
├── arch-guard-agent/
│   └── agent.js                # Core PR evaluation script
├── src/                        # Target application source code
│   └── controllers/            # API endpoints & request handlers
├── architecture_rules.md       # Enterprise architectural constraints
└── README.md                   # Project documentation
How It Works
Plaintext
[GitHub PR Diff] + [architecture_rules.md]
                  │
                  ▼
        [Agent Analysis (agent.js)]
                  │
                  ▼
   [PR Comment: Urgency Score & Drift]
                  │
                  ▼
     [Refactor via IBM Bob Agent]
Trigger: A developer opens a Pull Request or posts a trigger comment.

Analysis: The agent.js runner fetches the raw PR diff and cross-references it against architecture_rules.md.

Evaluation: The agent outputs a structured report containing:

Urgency Score: 1 (Low) to 5 (Critical)

Drift Detected: Yes / No

Violated Rule: Explanation of the breached architectural design boundary

Remediation: IBM Bob parses the evaluation, extracts the raw database/service calls from the controller, and generates the corrected DAO/Repository code ready for commit.

Architecture Rules (architecture_rules.md)
System rules are defined in plain Markdown. Example rules enforced by default include:

Rule A (Layer Boundaries): Controllers (/src/controllers) must route requests through Service or Repository layers and must never make direct SQL or database calls.

Rule B (Inter-Service Communication): Microservices must communicate using event busses or defined APIs, avoiding unabstracted cross-service queries.

Rule C (Data Access Isolation): Data persistence operations must strictly pass through Data Access Objects (DAOs) or Repository classes.
