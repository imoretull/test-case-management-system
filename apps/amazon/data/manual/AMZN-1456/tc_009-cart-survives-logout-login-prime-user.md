---
id: tc_009
title: "Cart survives logout/login (Prime user)"
folder: /Cart/Persistence
tags: ["@regression", "@prime", "@persistence"]
story_keys: [AMZN-1456]
last_run: 2d ago
last_status: PASS
owner: Alice
last_edited: 5d ago
---
## Steps

1. Log in as Prime user with item in cart
2. Log out, then log back in
3. Verify cart contents persist across session
