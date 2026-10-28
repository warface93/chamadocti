# Architecture rules
- Equipment loans and returns must use the database loan/return RPCs rather than directly changing inventory status, so stock updates remain atomic and history is preserved.
- Share scheduling, equipment selection, location-description and quantity validation helpers between meeting forms and their tests to keep creation and editing consistent.
- Keep meeting cancellation audit server-owned and retain outstanding loans until the existing return RPC records physical returns, so cancellation cannot fabricate stock availability.