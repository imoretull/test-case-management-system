---
id: tc_002
title: "Add item already in cart (quantity increments)"
folder: /Cart/Add
tags: ["@regression", "@cart"]
story_keys: [AMZN-1382]
last_run: 2d ago
last_status: PASS
owner: Alice
last_edited: 12d ago
---
## Steps

1. Add item X to cart
2. Open the same PDP, click "Add to cart" again
3. Verify quantity for X is now 2 (not two separate line items)
