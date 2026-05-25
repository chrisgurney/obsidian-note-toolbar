# Security policy

## Supported versions

Only the latest release of Note Toolbar receives security fixes.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| older   | ❌        |

## Scope

Note Toolbar is an Obsidian community plugin. Its security surface includes:

- **User scripts**: the plugin executes JavaScript provided by the user via the `ntb.*` API and CLI system. This is intentional and by design: scripts run with the same privileges as the plugin itself.
- **Toolbar configuration**: YAML/JSON stored in the vault; malformed or malicious config could affect plugin behavior.
- **CLI commands**: commands registered via the CLI that interact with vault data and plugin state.
- **Build pipeline**: `esbuild` plugins that read/write files during the build process.

Out of scope:
- Vulnerabilities in Obsidian itself or its API
- Issues requiring physical access to the device
- Social engineering attacks

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report them via one of:
- **GitHub private vulnerability reporting**: use the "Report a vulnerability" button under the Security tab of this repo
- **Google form**: [Submit the issue here](https://docs.google.com/forms/d/e/1FAIpQLSf_cABJLmNqPm-2DjH6vcxyuYKNoP-mmeyk8_vph8KMZHDSyg/viewform) if you don't have a GitHub account

Include as much detail as you can:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- The version of Note Toolbar and Obsidian you tested against
- Your OS and platform (desktop/mobile)

## Response Timeline

| Stage | Target |
| ----- | ------ |
| Acknowledgement | within 72 hours |
| Initial assessment | within 7 days |
| Fix or mitigation | dependent on severity |

## Security Considerations for Users

**User scripts run with full plugin privileges.** Only run scripts from sources you trust. Note Toolbar does not sandbox user-provided code.

If you distribute Note Toolbar toolbars or scripts to others, be aware that recipients will execute that code in their Obsidian vault with access to their filesystem (via Obsidian's API) and plugin state.
