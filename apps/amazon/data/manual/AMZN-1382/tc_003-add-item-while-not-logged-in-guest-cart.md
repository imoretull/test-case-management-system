---
id: tc_003
title: "Add item while not logged in (guest cart)"
folder: /Cart/Add
tags: ["@regression", "@cart", "@guest"]
story_keys: [AMZN-1382, AMZN-1457]
last_run: 2d ago
last_status: PASS
owner: Bob
last_edited: 8d ago
---
## Steps

1. Open the site in an incognito window
2. Add an item to cart without signing in
3. Verify cart persists across page navigation within the session
