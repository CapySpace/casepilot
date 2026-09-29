# 02: Create a Case and see it in the Build's list

**What to build:** The full "New Test Case" form and the real Test Cases section on Build Details,
replacing the "Test cases are not here yet" placeholder. This is the first end-to-end slice: a Member
writes a Case and sees it appear.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Build Details shows a Test Cases section with a "New Test Case" action, replacing the "Test cases
      are not here yet" card
- [ ] The New Test Case page lets a Member set a title (required), description, preconditions, an
      ordered list of steps (each with an action and an optional expected result), an overall expected
      result, priority and status
- [ ] Steps can be added, removed and reordered with up/down controls before submitting; a Case can be
      created with zero steps
- [ ] An empty or whitespace-only title is rejected in the browser and again in the Server Action
- [ ] Every field's length limit is enforced with a clear message, matching the schema's CHECK
      constraints
- [ ] A newly created Case is assigned a `TC-nnn` code and appears immediately in its Build's Case list
- [ ] The list shows each Case's code, title, priority and status
- [ ] A Build with no Cases yet shows an honest empty state explaining how to add one
- [ ] Any Member of the Project — not only the one who created the Build or its Release — can create a
      Case
- [ ] The Project Overview no longer says test cases "arrive next"
- [ ] Browser tests cover creating a Case with and without steps, the validation failures (blank title,
      over-limit fields), and the new Case appearing in the list
