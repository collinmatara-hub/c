# Help Desk Privacy, Priority and Fair Assignment — v3.3.5

- Ordinary users receive only their own ticket number(s) from the Help Desk API. Their Help Desk panel does not display ticket subject, description, status, priority, assignee, requester, or any other user's ticket.
- Only Super Administrator (`admin`), ICT Officer (`ict`), Help Desk Level 1 (`helpdesk_l1`) and Help Desk Level 2 (`helpdesk_l2`) can see the shared operational queue and manage tickets.
- New tickets are automatically assigned to the active Level 1/Level 2 agent with the fewest currently open tickets. Ties favor Level 1, then the lower user ID, so assignment is deterministic and load-aware.
- Tickets from senior institutional leadership (Vice Chancellor, Deputy VC, Registrar, Deputy Registrar, Deans/Deputy Deans, HOD, Finance Director, HR Director) are assigned urgent priority and sorted ahead of ordinary requests in the queue. This affects queue priority, not authorization.
- Only Help Desk L1/L2 accounts may be selected for assignment through the update endpoint.

Validation performed: backend route syntax and archive integrity. A full browser build/integration test still needs to be run in an environment with project dependencies installed.
