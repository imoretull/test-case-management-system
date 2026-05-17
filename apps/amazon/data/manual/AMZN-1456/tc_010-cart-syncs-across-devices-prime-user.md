---
id: tc_010
title: "Cart syncs across devices (Prime user)"
folder: /Cart/Persistence
tags: ["@regression", "@prime", "@persistence"]
story_keys: [AMZN-1456]
last_run: 2d ago
last_status: PASS
owner: Alice
last_edited: 5d ago
---
## Steps

1. Log in as Prime user on device A, add 2 items to cart
2. Log in as same user on device B
3. Verify both items appear in cart on device B within 30s
