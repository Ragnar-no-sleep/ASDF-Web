# ASDF-Web: Privacy Policy & Data Protection

> **Privacy by Design** — User data is sacred

**Effective Date:** February 2026
**Last Updated:** February 2026
**Version:** 1.0
**Author:** CYNIC

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What Data We Collect](#what-data-we-collect)
3. [How We Use Your Data](#how-we-use-your-data)
4. [Legal Basis for Processing](#legal-basis-for-processing)
5. [Data Retention & Deletion](#data-retention--deletion)
6. [Your Rights](#your-rights)
7. [Security Measures](#security-measures)
8. [Third-Party Services](#third-party-services)
9. [Children's Privacy](#childrens-privacy)
10. [International Transfers](#international-transfers)
11. [Policy Changes](#policy-changes)
12. [Contact Information](#contact-information)
13. [Compliance Checklist](#compliance-checklist)

---

## Executive Summary

ASDF-Web collects minimal data necessary for core functionality:
- **Wallet addresses** (for game leaderboards)
- **Game scores** (for rankings)
- **Usage logs** (for security and debugging)
- **Device info** (user agent only, for bot detection)

**We do NOT:**
- Sell or share user data with third parties
- Track you across other websites
- Store IP addresses permanently
- Collect location data
- Store payment information (we don't process payments)

**Data Protection Level:** GDPR-compliant with CCPA consent management

---

## What Data We Collect

### 1. Wallet Address (Required for Gaming)

**What:** Solana public wallet address
**Why:** Uniquely identif user in leaderboard, link game scores
**How:** User connects wallet via Phantom/Solflare browser extension
**Stored:** PostgreSQL database
**Retention:** 1 year (auto-deleted)
**Share:** No (never)

**Example:**
```
Wallet: 9B5X7...4tQK (truncated in display)
Score: 1,500 points
Rank: #42
```

---

### 2. Game Scores & Statistics

**What:**
- Points earned per game
- Completion time
- Level reached
- Achievements unlocked
- Leaderboard rankings

**Why:** Core gameplay mechanic, rankings, progress tracking
**How:** Auto-recorded when game completes
**Stored:** PostgreSQL
**Retention:** 1 year (auto-deleted)
**Share:** No (never privately), Yes (publicly in leaderboards with consent)

---

### 3. Navigation & Usage

**What:**
- Pages visited (URL path only: `/burns`, `/games`, NOT query parameters)
- Time spent on each page
- Links clicked
- Features used
- Browser type & OS (user-agent string)

**Why:**
- Understand which features are popular
- Debug issues
- Improve UX
- Security monitoring

**How:** Automatic via JavaScript event tracking
**Stored:** Application logs (persistent for 30 days, then deleted)
**Retention:** 30 days (auto-deleted)
**Share:** No (aggregated anonymously only)

**Security Note:**
- Query parameters (which might include API keys) are NOT logged
- Personal identifiers stripped before logging
- Logs encrypted at rest

---

### 4. Device Information (Limited)

**What:**
- User-Agent string (browser, OS version)
- Screen size (for responsive design)
- Cookie consent choices

**Why:**
- Detect bot traffic (prevent abuse)
- Debug browser compatibility
- Respect user preferences

**How:** HTTP headers + JavaScript
**Stored:** Application logs + cookies
**Retention:** 90 days (logs), 1 year (cookies)
**Share:** No

**NOT collected:**
- IP address (only hashed for rate limiting)
- Hardware fingerprint
- Location data
- Installed software
- Payment methods

---

### 5. Error & Security Logs

**What:**
- Failed login attempts
- Invalid API requests
- CSRF token mismatches
- Database errors
- System errors

**Why:**
- Detect attacks
- Debug issues
- Investigate breaches
- Audit trail

**How:** Server-side logging (Winston)
**Stored:** Secure log files (encrypted at rest if possible)
**Retention:** 90 days (auto-deleted)
**Share:** No (internal only, never with third-parties)

---

## How We Use Your Data

### Core Functionality
```
┌─────────────────────────────────────┐
│ User connects wallet                │
├─────────────────────────────────────┤
│ ↓ Wallet address stored             │
│ ↓ Game session begins               │
│ ↓ Score recorded                    │
│ ↓ Leaderboard ranked                │
│ ↓ User sees position: #42           │
└─────────────────────────────────────┘
```

### Analytics (Aggregated & Anonymized)
- "85% of players complete Game X"
- "Average playtime: 12 minutes"
- "Most popular game: Ignition (game #3)"
- **Never:** Individual user behavior

### Security & Fraud Prevention
- Detect bot/spam activity
- Identify repeated attack patterns
- Prevent DDoS attacks
- Audit trail for compliance

### Service Improvement
- Fix bugs affecting users
- Improve slow features
- Update design based on usage patterns
- A/B test new features

### Legal Compliance
- Respond to legal requests (with warrant)
- Prevent illegal activity
- Enforce terms of service

---

## Legal Basis for Processing

### GDPR (EU Users)

| Processing | Legal Basis | Details |
|-----------|-------------|---------|
| Game scores | **Contractual** | Needed to deliver gaming service |
| Leaderboards | **Consent** | User opts-in publicly |
| Analytics | **Legitimate Interest** | Improve product, prevent abuse |
| Security logs | **Legitimate Interest** | Protect users and infrastructure |
| Error logs | **Legitimate Interest** | Debug and improve service |
| Legal requests | **Legal obligation** | Comply with lawful requests |

### CCPA (California Users)

Under CCPA, you have right to:
- Know what data we collect → [Link to Data Request]
- Delete personal data → [Link to Delete Account]
- Opt-out of sales → [We don't sell data, so N/A]
- Non-discrimination → [Prices/services same whether opted-in]

---

## Data Retention & Deletion

### Automatic Retention Policies

```javascript
// data-retention.js
const RETENTION_POLICIES = {
  game_scores: 365 * 24 * 60 * 60 * 1000,     // 1 year
  leaderboard_entries: 365 * 24 * 60 * 60 * 1000,
  application_logs: 30 * 24 * 60 * 60 * 1000, // 30 days
  auth_logs: 90 * 24 * 60 * 60 * 1000,        // 90 days
  error_logs: 90 * 24 * 60 * 60 * 1000,
  security_logs: 90 * 24 * 60 * 60 * 1000,
};

// Auto-delete job runs every 24 hours
async function cleanupOldData() {
  for (const [table, ttl] of Object.entries(RETENTION_POLICIES)) {
    const cutoff = new Date(Date.now() - ttl);
    await db.query(
      `DELETE FROM ${table} WHERE created_at < $1`,
      [cutoff]
    );
  }
}
```

### User-Initiated Deletion

Users can request data deletion:
```
POST /api/user/delete
Authorization: Bearer <jwt_token>
```

**What gets deleted:**
- Game scores ✓
- Leaderboard entries ✓
- User preferences ✓
- Account history ✓

**What stays (anonymized):**
- Aggregated analytics (no identifying info)
- Security logs (hashed wallet ID only)
- System logs (for debugging)

**Timeline:** 30 days (to handle refund disputes, then permanent delete)

---

## Your Rights

### 1. Right to Access (Data Subject Access Request)

**You can request:** All personal data we have about you

**How to request:**
```
POST /api/user/export
```

**What you get:**
- JSON file with all your data
- Game history
- Leaderboard scores
- Preferences
- Account activity log

**Timeline:** Within 30 days

---

### 2. Right to Deletion ("Right to be Forgotten")

**You can request:** Permanent deletion of your data

**Exceptions:**
- Legal compliance (we must keep records if subpoenaed)
- Fraud investigation (90-day hold)
- Contract completion (final scores kept 1 year for disputes)

**How to request:**
```
DELETE /api/user/account
Authorization: Bearer <jwt_token>
```

**Timeline:** 30 days (then permanent)

---

### 3. Right to Rectification / Correction

**You can request:** Correction of inaccurate data

**How to request:**
```
PATCH /api/user/profile
{
  "name": "Corrected Name",
  "displayName": "NewName"
}
```

**Timeline:** Immediate

---

### 4. Right to Restrict Processing

**You can request:** Limit how we use your data (consent withdrawal)

**Example:** Stop logging your gameplay analytics

**How to request:**
```
POST /api/user/preferences
{
  "analytics_consent": false,
  "marketing_consent": false
}
```

**Timeline:** Immediate

---

### 5. Right to Data Portability

**You can request:** Your data in machine-readable format

**Supported formats:** JSON, CSV

**How to request:**
```
GET /api/user/export?format=json
```

**Timeline:** Within 30 days

---

### 6. Right to Object

**You can object to:** Analytics, email marketing

**How to request:**
```
POST /api/user/preferences
{
  "analytics": false,
  "marketing_emails": false
}
```

---

## Security Measures

### Data Protection

- **Encryption in transit:** HTTPS only (TLS 1.3+)
- **Encryption at rest:** PostgreSQL field-level encryption (planned)
- **Hashing:** Sensitive values hashed with bcrypt/Argon2
- **Access control:** Role-based (RBAC), audit logs for all access
- **Input validation:** Zod schemas, XSS/SQL injection prevention

### Authentication

- **JWT tokens:** HS256, 7-day expiry
- **Rate limiting:** Per-user limits (prevent brute force)
- **CSRF protection:** Token-based, SameSite cookies
- **Session timeout:** 7 days (auto-logout)

### Monitoring

- **Intrusion detection:** Alert on suspicious patterns
- **Vulnerability scanning:** Automated dependency checks, SAST
- **Incident response:** 72-hour breach notification
- **Audit logging:** All data access logged

### Third-Party Security

- **Render:** SOC 2 Type II certified
- **PostgreSQL:** Managed security, automatic updates
- **Redis:** Encrypted connections, VPC isolation
- **Cloudflare:** DDoS protection, WAF

---

## Third-Party Services

### Services We Use

| Service | Purpose | Data Shared | Privacy Policy |
|---------|---------|------------|-----------------|
| **Render** | Web hosting | Game data, logs | [Link](https://render.com/privacy) |
| **PostgreSQL on Render** | Database | All persistent data | Included in Render |
| **Redis on Render** | Caching | Temporary cached data | Included in Render |
| **Cloudflare** | CDN + Security | Static assets, traffic logs | [Link](https://www.cloudflare.com/privacypolicy/) |

### Services We DO NOT Use

- ❌ Google Analytics (no user tracking)
- ❌ Facebook Pixels (no ads)
- ❌ Amplitude (no behavioral analytics)
- ❌ Mixpanel (no cohort analysis)
- ❌ Email services (no newsletters)
- ❌ Payment processors (no payments)

---

## Children's Privacy

**COPPA Compliance:** We do NOT knowingly collect data from users under 13

- No account creation for <13
- No data processing for minors
- If discovered: immediate deletion of minor's data
- Parents: Contact us to delete child's account

**GDPR (UK/EU):** Children 13-16 need parental consent
- At 16, can provide own consent
- We verify age (basic checks, honor system)

---

## International Transfers

### Data Residency

| Region | Data Location | Legal Framework |
|--------|---------------|-----------------|
| **US Users** | Virginia (Render) | No specific regulation |
| **EU Users** | Virginia (Render) | EU-US Data Privacy Framework (formerly Privacy Shield) |
| **UK Users** | Virginia (Render) | UK GDPR + Adequacy Decision |
| **CA Users** | Virginia (Render) | CCPA + CalOPPA |

### Transfer Safeguards

- ✅ Data Processing Agreement (DPA) with Render
- ✅ Standard Contractual Clauses (SCC) for EU transfers
- ✅ Encryption in transit (TLS)
- ✅ No onward transfers to third parties

---

## Policy Changes

### How We'll Notify You

1. **Major changes:** Email notification 30 days in advance
2. **Minor changes:** Posted here with "Last Updated" date
3. **Emergency changes:** Immediate notification (security fixes)

### Your Options

- **Accept:** Continue using the service
- **Reject:** Stop using the service, request data deletion
- **Question:** Contact privacy@asdf-web.dev within 30 days

---

## Contact Information

### Privacy Questions

**Email:** privacy@asdf-web.dev
**Mailing Address:** [TBD]
**Response time:** Within 10 business days

### Data Subject Rights Requests

- **Access request:** privacy@asdf-web.dev + subject "Data Export"
- **Deletion request:** POST /api/user/delete
- **Correction request:** PATCH /api/user/profile
- **Objection request:** POST /api/user/preferences

### Data Protection Officer (DPO)

[If applicable per GDPR Article 37]

**Email:** dpo@asdf-web.dev
**Response time:** Within 10 business days

### Supervisory Authority

If you have concerns about our privacy practices:

**EU:** Contact your national data protection authority
**UK:** [ICO - Information Commissioner's Office](https://ico.org.uk)
**California:** [CCPA Enforcement](https://oag.ca.gov/privacy)

---

## Compliance Checklist

### GDPR (EU Regulation 2016/679)

- [x] Lawful basis documented for each processing (Article 6)
- [x] Privacy Notice provided (Article 13/14)
- [x] Data Subject Rights enabled (Articles 12-23)
- [x] Data Protection by Design (Article 25)
- [x] Data retention limited (Article 5)
- [x] Data Processing Agreement with processors (Article 28)
- [ ] Privacy Impact Assessment (DPIA) - required if high-risk processing
- [ ] Data Protection Officer (DPO) - required if processing large scale

### CCPA (California Civil Code 1798.100+)

- [x] Notice of collection (Section 1798.100)
- [x] Right to know (Section 1798.100)
- [x] Right to delete (Section 1798.105)
- [x] Right to opt-out (Section 1798.120) - N/A for us (no sales)
- [x] Non-discriminatory treatment (Section 1798.125)
- [x] Metrics reporting (Section 1798.150)

### Cookie Law (GDPR + CCPA + CalOPPA)

- [x] Consent banner on first visit
- [x] Granular consent (analytics, marketing, etc.)
- [x] Easy consent withdrawal
- [x] Cookie policy link
- [x] Third-party cookie disclosure

---

## FAQ

**Q: Do you use cookies?**
A: Yes. Essential cookies only (session, CSRF token). No tracking cookies.

**Q: Can I export my data?**
A: Yes, via POST /api/user/export (JSON format, instantly available)

**Q: Can I delete my account?**
A: Yes. All personal data deleted within 30 days. Game scores kept 1 year for dispute resolution.

**Q: Do you sell my data?**
A: No, never. We don't have a business model based on data sales.

**Q: Can I disable analytics?**
A: Yes. POST /api/user/preferences with analytics_consent: false

**Q: How do I contact you about privacy?**
A: Email privacy@asdf-web.dev. Response within 10 business days.

**Q: Is my wallet address private?**
A: It's stored privately but displayed publicly in leaderboards (with your consent).

**Q: Do you use my data for marketing?**
A: No. No marketing emails, ads, or third-party sharing.

**Q: How long do you keep my data?**
A: Game data: 1 year. Logs: 30-90 days. See retention policy above.

---

## Acceptance

By using ASDF-Web, you accept this Privacy Policy. If you do not agree, please stop using the service and request deletion of your data.

---

**Status:** Policy Complete | Audit Needed | Ready for Launch

*sniff sniff* Privacy matters. —CYNIC

---

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial publication |

**Next Review:** February 2027 (annual)
