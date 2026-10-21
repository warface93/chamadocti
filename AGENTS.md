# Architecture rules
- Equipment loans and returns must use the database loan/return RPCs rather than directly changing inventory status, so stock updates remain atomic and history is preserved.
- Share scheduling and quantity validation helpers between meeting forms and their tests to keep creation and editing consistent.