(function (root) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  const time = seconds => { const n = Math.max(0, Math.ceil(seconds)); return Math.floor(n / 60).toString().padStart(2,'0') + ':' + (n % 60).toString().padStart(2,'0'); };

  const WAVE = {
  "circle": {
    "name": "Relation",
    "why": "One relationship tells you how two things are connected. Use the circle to hold both things and their connection in mind.",
    "example": "In a wooden pencil, the wood holds the core in place. The connection is between the wood and the core, and its meaning is “holds in place.”",
    "check": "If the wood broke away, what might happen to the core?",
    "note": "Try another relationship: a nest holds an egg. Name both things and how they are connected.",
    "relationships": [
      "The wood holds the core in place. The core is the part that makes a mark."
    ],
    "teacherNote": "Awareness receives the relationship as a whole. The two participants supply its two ends. The circular boundary frames the observation, so only the stated relationship counts.",
    "teacherExample": "The wooden casing supports the graphite. Recovering “pencil” alone would lose who supports what.",
    "abstract": {
      "definition": "A relation is a condition that two things can satisfy. The circle represents one such claim. For two pencils, “A is longer than B” holds whenever the length of A exceeds the length of B. The same rule applies to any pair, whatever their colours.",
      "label": "Check",
      "check": "Pencil A is 12 cm long and pencil B is 9 cm long. Repaint A and the claim stays true. Shorten A to 8 cm and the claim becomes false."
    }
  },
  "half-circle": {
    "name": "Distinction",
    "why": "Keep the same two things in mind. Find two different ways they are connected.",
    "example": "In a wooden pencil, the wood holds the core in place and covers most of it. These are two distinct relationships between the same two parts.",
    "check": "If the covering were transparent, which relationship could remain even though you could see the core?",
    "note": "These are two distinct connections: holding the core and covering it. Saying 'the core is held by the wood' repeats the first connection in different words.",
    "relationships": [
      "The wood holds the pencil's core in place. This describes support.",
      "The wood covers most of the core. This describes what is visible."
    ],
    "teacherNote": "Awareness holds the pair and attention singles out one meaning at a time. “The wood supports the graphite” and “the graphite is supported by the wood” express the same relationship. Support and concealment give you two.",
    "teacherExample": "The casing supports the graphite and conceals it. Cut a narrow viewing window into the casing and some graphite can become visible while it remains supported.",
    "abstract": {
      "definition": "Two descriptions of the same pair express distinct relationships if one can change while the other stays true. The half-circle keeps both participants fixed so you can test that distinction.",
      "label": "Check",
      "check": "Pencil A is longer than B and lies to its left. Move A to the right of B. Only the position claim changes. By contrast, “B is shorter than A” restates the length claim and always changes with it."
    }
  },
  "triangle": {
    "name": "System",
    "why": "A triangle connects three things. Each side shows a relationship. Look for how the relationships work together.",
    "example": "Mia fills a watering can. The can brings water to a plant. By watering it, Mia helps the plant grow. Each of the three participants is connected to the other two.",
    "check": "If the can leaked before reaching the plant, how might that affect Mia’s attempt to water it?",
    "note": "Trace the three connections: Mia fills the can; the can brings water to the plant; Mia helps the plant grow. The can helps explain how she does it.",
    "reach": "Between two corners, you can take one side or go the long way along two sides.",
    "relationships": [
      "Mia fills the watering can. She puts water into the can.",
      "The can carries water to the plant. It is the means Mia uses to water it.",
      "Mia helps the plant grow by watering it. This is how Mia and the plant are connected."
    ],
    "teacherNote": "Triangle is the first closed triad in this progression. Supply a basis for the closing relationship. It may follow from a rule, as when two height differences of +2 m and +3 m imply a total rise of +5 m. In a practical system, explain the conditions that connect the three sides.",
    "teacherExample": "The ocean supports the boat, the boat carries the fisher, and the fisher depends on the ocean for a livelihood. If this boat is their only way to the offshore grounds, it explains how the fisher can act on that dependence.",
    "abstract": {
      "definition": "The triangle closes all three pairs among three positions. It can represent a system when the relationships obey a common rule. For three points at different heights, the signed rise from A to C equals the rise from A to B plus the rise from B to C.",
      "label": "Prediction",
      "check": "If B is 2 m above A and C is 3 m above B, C is 5 m above A. Raise B by 1 m while keeping A and C fixed. The two rises become 3 m and 2 m. Their sum must stay 5 m."
    }
  },
  "square": {
    "name": "Network",
    "why": "A square can connect two relationships that have no participant in common. Follow the other sides to see how they fit together.",
    "example": "Mia fills a watering can. The can waters a plant; the plant grows beans; Mia eats those beans. Follow the four relationships to see how Mia’s action connects to her food.",
    "check": "How could less water change the amount of beans available to Mia?",
    "note": "Start at the can and trace a route to the beans through the plant. Then trace the other route through Mia.",
    "reach": "Across the square, both ways round take two steps.",
    "relationships": [
      "Mia fills the watering can. The water becomes available for the plant.",
      "The can carries water to the plant. This connects Mia's action to the plant.",
      "The plant grows beans. Its growth supplies the food in this example.",
      "Mia eats the beans. The food connects the plant back to Mia."
    ],
    "teacherNote": "Opposite corners also have two routes between them, each through a different intermediary. Read the meaning of every side as you trace it. Movement around the diagram represents feedback only when an effect can travel all the way back to influence its source.",
    "teacherExample": "“The ocean contains the boat” and “the fisher supplies the village” have no participant in common. The boat enables the fisher, and the village depends on the ocean. These two meanings complete the square.",
    "abstract": {
      "definition": "A network specifies which connections are available. In a square, opposite corners have two routes between them, each through a different intermediate corner. This gives a precise meaning to an alternative route.",
      "label": "Check",
      "check": "Join A–B–C–D–A with two-way paths. From A to C you can go via B or D. Close the A–B path and C is still reachable via D. Close A–D as well and A is cut off."
    }
  },
  "pentagon": {
    "name": "Perspective",
    "why": "Choose a position in the shape and look across at a relationship. What does that relationship mean from this position?",
    "example": "Mia fills a can, and the can waters a plant. The plant grows beans, the beans go into soup, and Mia eats the soup. From Mia’s position, the plant’s growth contributes to her meal.",
    "check": "How does the same plant look from the watering can’s position? What does the can contribute?",
    "note": "You can start with the plant too. From that position, consider where its water comes from and what happens to its beans.",
    "reach": "Between the furthest corners, one way takes two steps and the other takes three.",
    "relationships": [
      "Mia fills the can with water. This prepares it for watering.",
      "The can brings water to the plant. It connects Mia's action to the plant.",
      "The plant grows beans. The beans are the part the cook can use.",
      "The beans go into the soup. This connects the plant's harvest to a meal.",
      "Mia eats the soup. The meal connects the result back to her."
    ],
    "teacherNote": "A standpoint can be a component or a condition as well as a person. The five-part fishing example also opens “fisher supplies village” into “fisher harvests catch” and “catch nourishes village.” Keep these two relationships when counting the pentagon. The earlier shortcut remains a summary.",
    "teacherExample": "Take the village as your standpoint and the boat enabling the fisher as your focal relationship. The ocean lies on one side and the catch on the other. From the village’s position, the boat’s importance is the access it gives to a food supply.",
    "abstract": {
      "definition": "Perspective is dependence on a reference position. In the pentagon, choose one corner as your starting point and the edge across from it as the connection to examine. Its importance for a journey can change when only the starting point changes.",
      "label": "Check",
      "check": "Five stops form a ring, A–B–C–D–E–A. Each track takes one minute either way. Closing C–D leaves the shortest trip from A to D at two minutes, via E. From B to D, the same closure increases the shortest trip from two minutes to three."
    }
  },
  "hexagon": {
    "name": "Mediation",
    "why": "Choose two relationships on opposite sides. Trace the positions between them to see how they can affect each other.",
    "example": "Mia fills a can; the can waters a bean plant; the plant grows beans. A cook picks the beans and makes soup, which Mia eats. The beans connect the plant’s growth to the cook’s work.",
    "check": "If the plant produced fewer beans, how might that affect the soup? What other ingredients could the cook use?",
    "note": "Trace the other side too: Mia fills the can and eats the soup. Each connection needs its own explanation.",
    "reach": "Between opposite corners, either way takes three steps.",
    "relationships": [
      "Mia fills the watering can. This makes water available for the plant.",
      "The can brings water to the plant. It carries the water from Mia to the plant.",
      "The plant grows beans. The beans connect its growth to the cook's work.",
      "The cook picks the beans from the plant. The harvest passes to the cook.",
      "The cook makes soup using the beans. The soup carries the harvest into the meal.",
      "Mia eats the soup. This connects the meal back to the person who filled the can."
    ],
    "teacherNote": "Mediation here means tracing an intermediate connection. Containment, authority and causation carry different implications. Name what each step contributes before treating the entire route as a chain of influence.",
    "teacherExample": "The boat enables the fisher, and the village sets a quota. Trace between them through the catch that feeds the village, then through the ocean where the quota limits extraction. The quota changes what the fisher may take while the boat still provides access.",
    "abstract": {
      "definition": "Mediation asks which intermediate connection carries an effect. Take two opposite sides of a hexagon. Each route between those sides passes through a different intermediate position, so each route can be tested separately.",
      "label": "Check",
      "check": "Six stops form a two-way ring, A–B–C–D–E–F–A. A traveller going from track A–B to track D–E can pass through C or F. Blocking passage through C removes one route. Blocking C and F removes both. C is necessary for one route and optional for the journey."
    }
  },
  "heptagon": {
    "name": "Context",
    "why": "Place one relationship alongside a process elsewhere in the same shape. Ask how the process helps explain why the relationship matters.",
    "example": "Mia fills a can; the can waters a plant; the plant grows beans. The cook picks the beans and puts a pot on the stove. Bean soup cooks in the pot, and Mia eats the soup. The kitchen gives context to why the watering matters here.",
    "check": "If the cook made carrot soup instead, which part of the story would change?",
    "note": "The plant, beans and cook connect the garden to the kitchen. If the cook made carrot soup instead, consider what would change.",
    "reach": "Between the furthest corners, one way takes three steps and the other takes four.",
    "relationships": [
      "Mia fills the can with water. The can is ready for watering.",
      "The can carries water to the plant. It is the means Mia uses.",
      "The plant grows beans. They are available to harvest.",
      "The cook picks the beans. The harvest passes from the garden to the cook.",
      "The cook puts the pot on the stove. The pot is ready to hold the soup.",
      "Bean soup cooks in the pot. This connects the pot to the meal.",
      "Mia eats the soup. The meal connects the kitchen process back to Mia."
    ],
    "teacherNote": "A pencil can supply context too. Set the casing’s support of the graphite against the process of sharpening: the blade removes wood, and wood removal exposes more graphite. This illustrates the focal comparison. Completing a heptagon still requires seven distinct relationships around the ring.",
    "teacherExample": "Focus on the boat giving the fisher access. Elsewhere, the village authorises the council and the council sets a quota. The catch and the ocean connect the two portions. A working boat can reach grounds where the permitted catch has changed.",
    "abstract": {
      "definition": "Context is information needed to interpret a relationship. The heptagon lets you hold one focal relationship apart from a two-step process elsewhere in the ring. To test for contextual dependence, hold the focal observation fixed and change how it arose.",
      "label": "Check",
      "check": "A scale displays 12 g with powder in a 2 g cup. If you placed the empty cup on the scale and then set it to zero, the powder weighs 12 g. If you set the bare scale to zero before adding the cup and powder, the powder weighs 10 g. The same reading supports different conclusions."
    }
  },
  "octagon": {
    "name": "Parallelism",
    "why": "Trace two processes on different sides of the shape. Compare what each does and where they connect.",
    "example": "In the garden, Mia fills a can and the can waters a plant. In the kitchen, a cook places a pot on the stove and soup cooks in it. The plant grows beans for the cook; the soup goes into a bowl that Mia holds.",
    "check": "What does the can contribute to one process, and what does the pot contribute to the other?",
    "note": "The two processes can change independently: the cook could use a larger pot while Mia keeps the same can.",
    "reach": "Between opposite corners, either way takes four steps.",
    "relationships": [
      "Mia fills the can. This begins the garden process.",
      "The can carries water to the plant. This completes the garden's two-step process.",
      "The plant grows beans. They become available to the cook.",
      "The cook picks the beans. This connects the garden to the kitchen.",
      "The cook places a pot on the stove. This begins the kitchen process.",
      "The bean soup cooks in the pot. This completes the kitchen's two-step process.",
      "The soup goes into a bowl. This moves the meal from the pot to the bowl.",
      "Mia holds the bowl. The bowl connects the meal back to Mia."
    ],
    "teacherNote": "Parallelism means the two accounts can be followed alongside one another. Their directions, timing and outcomes may differ. A quota can agree with a stock estimate even when the estimate is inaccurate. Distinguish the representation from what it represents.",
    "teacherExample": "The ocean contains the boat and the boat enables the fisher. Alongside that, the village authorises the council and the council sets a quota. The catch and the stock estimate connect the two processes. Access may stay steady while the permitted catch falls.",
    "abstract": {
      "definition": "Parallelism lets you compare two sequences using the same input and the same outcome measure. Opposite portions of the octagon can each represent two successive operations. This makes the order of the operations testable.",
      "label": "Check",
      "check": "Start both sequences at 1.4. Round to the nearest whole number, then double: 1 becomes 2. Double first, then round: 2.8 becomes 3. One input that gives different outputs is enough to show that the two procedures are not interchangeable."
    }
  },
  "prism": {
    "name": "Correspondence",
    "why": "The prism contains two triangles joined by three connections. Match a position in one triangle to its counterpart in the other.",
    "example": "A fisher travels by boat on the sea. A walker travels along a path through the forest. Pair sea with forest, boat with path, and fisher with walker. Each pair has something in common.",
    "check": "Both boat and path provide access. What is one difference between them?",
    "note": "The sea and the forest are the settings; the boat and the path provide access; the fisher and the walker travel. A boat moves, while a path stays in place.",
    "relationships": [
      "The boat floats on the sea. The sea is where this journey happens.",
      "The boat carries the fisher. It provides a way to travel.",
      "The fisher travels on the sea. This connects the traveller to the setting.",
      "The path passes through the forest. The forest is where this journey happens.",
      "The path guides the walker. It provides a way to travel.",
      "The walker travels through the forest. This connects the traveller to the setting.",
      "Sea and forest correspond as settings, even though one is water and the other is land.",
      "Boat and path correspond as ways to travel. The boat moves with its passenger; the path stays in place.",
      "Fisher and walker correspond as travellers in their respective settings."
    ],
    "teacherNote": "Six participants carry nine relationships: three in each triad and three across them. A triangular pencil has this geometry in its two ends and three long edges. To use it for analogy, give each correspondence a basis in the meaning of the two scenes.",
    "teacherExample": "Ocean and forest provide the environments. Boat and path provide access. Fisher and walker use that access. The boat moves with the fisher, while the path stays in place: this is one limit of the match.",
    "abstract": {
      "definition": "A correspondence pairs positions in two structures according to a stated rule. The prism supplies three pairings between two triangles. You can test the proposed match by asking which relationships survive the substitution.",
      "label": "Check",
      "check": "Give the first triangle heights of 2, 5 and 9 m. Match them to 12, 15 and 19 m in the second. All three height differences are preserved. Swap the last two matches: a rise of 3 m in the first triangle now maps to a rise of 7 m in the second."
    }
  },
  "cube": {
    "name": "Alignment",
    "why": "Match the positions of two square networks. Then compare the relationships between the matched positions.",
    "example": "A boat helps a fisher work at sea; the fisher supplies a village. Water pipes help a farmer work in a field; the farmer supplies a town. Match the environments, tools, producers and communities.",
    "check": "If the farmer keeps all the carrots, which relationship no longer matches the fishing story?",
    "note": "The fisher and farmer can still both produce food, even if only the fisher supplies a community.",
    "relationships": [
      "The boat floats on the sea. The sea is the fisher's working environment.",
      "The boat carries the fisher. It helps the fisher work at sea.",
      "The fisher brings fish to the village. Food passes from the producer to the community.",
      "The village receives food from the sea. This connects the community to the environment.",
      "Water pipes run through the field. The field is the farmer's working environment.",
      "The pipes carry water for the farmer's crops. They help the farmer work in the field.",
      "The farmer brings carrots to the town. Food passes from the producer to the community.",
      "The town receives food from the field. This connects the community to the environment.",
      "Sea and field correspond as environments that provide food.",
      "Boat and pipes correspond as tools that help people work in their environments.",
      "Fisher and farmer correspond as producers who supply food.",
      "Village and town correspond as communities receiving food."
    ],
    "teacherNote": "Eight participants carry twelve relationships: four in each square and four across them. A match between individual roles can hold after a match between their relationships fails. Keep the parts of the analogy that the two scenes still support.",
    "teacherExample": "In the fishing scene the fisher supplies the village. In the cultivation scene the grower supplies the town. Matching fisher with grower and village with town preserves the direction and meaning of supply.",
    "abstract": {
      "definition": "Alignment asks whether a whole set of correspondences preserves the relationships being studied. The cube pairs four positions in one square with four in another. For a route map, a valid match must preserve the permitted direction of travel on each side.",
      "label": "Check",
      "check": "Match stops A, B, C and D to stops 1, 2, 3 and 4. If travel is allowed from B to C, its counterpart must allow travel from 2 to 3. A one-way track from 3 to 2 breaks that alignment even though every stop still has a counterpart."
    }
  },
  "dodecahedron": {
    "name": "Architecture",
    "why": "The dodecahedron has twelve five-sided faces. Neighbouring faces share an edge, so one connection can form part of two local patterns.",
    "example": "Imagine the edges as paths on a park map. The path from the oak tree to the duck pond belongs to two neighbouring pentagonal routes. It is one shared path in both routes.",
    "check": "If that path closes, which routes need to be reconsidered?",
    "note": "If the path is blocked, consider how that affects routes around each face. The path is counted once even though two faces share it.",
    "relationships": [
      "A path runs from the oak tree to the duck pond.",
      "A path runs from the duck pond to the sandpit.",
      "A path runs from the sandpit to the little bridge.",
      "A path runs from the little bridge to the big slide.",
      "A path runs from the big slide to the picnic table.",
      "A path runs from the picnic table to the climbing tree.",
      "A path runs from the climbing tree to the stone wall.",
      "A path runs from the stone wall to the red bench.",
      "A path runs from the red bench to the old well.",
      "A path runs from the old well to the oak tree.",
      "A path runs from the tree house to the flower bed.",
      "A path runs from the flower bed to the swings.",
      "A path runs from the swings to the water tap.",
      "A path runs from the water tap to the big rock.",
      "A path runs from the big rock to the tree house.",
      "A path runs from the flagpole to the wooden boat.",
      "A path runs from the wooden boat to the snack stand.",
      "A path runs from the snack stand to the hopscotch squares.",
      "A path runs from the hopscotch squares to the tent.",
      "A path runs from the tent to the flagpole.",
      "A path runs from the oak tree to the tree house.",
      "A path runs from the duck pond to the flagpole.",
      "A path runs from the sandpit to the flower bed.",
      "A path runs from the little bridge to the wooden boat.",
      "A path runs from the big slide to the swings.",
      "A path runs from the picnic table to the snack stand.",
      "A path runs from the climbing tree to the water tap.",
      "A path runs from the stone wall to the hopscotch squares.",
      "A path runs from the red bench to the big rock.",
      "A path runs from the old well to the tent."
    ],
    "teacherNote": "Twelve pentagons meet at twenty vertices and share thirty distinct edges. A shared relationship counts once in the model even when two faces use it. Its consequences in either face depend on what the neighbouring relationships mean.",
    "teacherExample": "In the cooperative, follow the relationship between the tank and the watering system. Imagine a blockage interrupting supply. Find both pentagons that contain that relationship and examine its place in each.",
    "abstract": {
      "definition": "Architecture determines which local patterns share a constraint. Each edge of a dodecahedron belongs to two pentagonal faces. If both faces use the same measurement for that edge, a revision affects both accounts.",
      "label": "Prediction",
      "check": "Record a signed height change along every edge. Walk around both neighbouring faces clockwise as seen from outside. You cross their shared edge in opposite directions. Increase its recorded rise by 1 m in one direction, holding all other readings fixed. One circuit total increases by 1 m and the other decreases by 1 m."
    }
  },
  "icosahedron": {
    "name": "Duality",
    "why": "A dodecahedron and an icosahedron are geometric duals. Each face of the dodecahedron becomes a position in the icosahedron.",
    "example": "Place a dot at the centre of each pentagonal face of a dodecahedron. Join dots whose faces share an edge. The twelve dots and their connections form an icosahedron.",
    "check": "What does a single dot in the new shape represent in the original?",
    "note": "Where three faces of the dodecahedron meet, the corresponding three dots form one triangle.",
    "relationships": [
      "A path runs from the oak tree to the duck pond.",
      "A path runs from the oak tree to the sandpit.",
      "A path runs from the oak tree to the little bridge.",
      "A path runs from the oak tree to the big slide.",
      "A path runs from the oak tree to the picnic table.",
      "A path runs from the climbing tree to the stone wall.",
      "A path runs from the climbing tree to the red bench.",
      "A path runs from the climbing tree to the old well.",
      "A path runs from the climbing tree to the tree house.",
      "A path runs from the climbing tree to the flagpole.",
      "A path runs from the duck pond to the sandpit.",
      "A path runs from the sandpit to the little bridge.",
      "A path runs from the little bridge to the big slide.",
      "A path runs from the big slide to the picnic table.",
      "A path runs from the picnic table to the duck pond.",
      "A path runs from the stone wall to the red bench.",
      "A path runs from the red bench to the old well.",
      "A path runs from the old well to the tree house.",
      "A path runs from the tree house to the flagpole.",
      "A path runs from the flagpole to the stone wall.",
      "A path runs from the duck pond to the stone wall.",
      "A path runs from the duck pond to the flagpole.",
      "A path runs from the sandpit to the red bench.",
      "A path runs from the sandpit to the stone wall.",
      "A path runs from the little bridge to the old well.",
      "A path runs from the little bridge to the red bench.",
      "A path runs from the big slide to the tree house.",
      "A path runs from the big slide to the old well.",
      "A path runs from the picnic table to the flagpole.",
      "A path runs from the picnic table to the tree house."
    ],
    "teacherNote": "The dodecahedron has twelve faces and twenty vertices. Its dual has twelve vertices and twenty triangular faces. Both have thirty edges. Geometry gives an exact correspondence; translating a cooperative or ferry relationship into another description requires its own justification.",
    "teacherExample": "With a finger on one pentagon, trace its five neighbours. In the dual picture that whole pentagon becomes one vertex with five incident edges. In the ferry exercise, a local triangle connects safety, accessibility and vessel design.",
    "abstract": {
      "definition": "Duality exchanges what counts as a position and what counts as a face while preserving a precise pattern of connections. Place a point at the centre of each dodecahedral face. Join two points exactly when their faces share an edge.",
      "label": "Check",
      "check": "Three pentagons meet at each original corner. Their three centre points form one new triangle. The 12 old faces become 12 vertices, and the 20 old vertices give 20 triangular faces. Each shared edge gives one new connection, so both shapes have 30 edges."
    }
  },
  "geodesic": {
    "name": "Resolution",
    "why": "Divide each triangular face into smaller triangles. A connection can then be explored through an intermediate position.",
    "example": "On a park map, a path once ran directly from an oak tree to a duck pond. Add a red gate halfway: one segment now leads to the gate, and a second leads from the gate to the pond.",
    "check": "If the gate-to-pond segment closes, which part of the original route remains open?",
    "note": "The refined mesh lets you examine the parts of a route and how those parts connect to nearby routes.",
    "relationships": [
      "A path runs from the oak tree to the red gate.",
      "A path runs from the red gate to the duck pond.",
      "A path runs from the oak tree to the blue gate.",
      "A path runs from the blue gate to the sandpit.",
      "A path runs from the oak tree to the green gate.",
      "A path runs from the green gate to the little bridge.",
      "A path runs from the oak tree to the yellow gate.",
      "A path runs from the yellow gate to the big slide.",
      "A path runs from the oak tree to the purple gate.",
      "A path runs from the purple gate to the picnic table.",
      "A path runs from the climbing tree to the pink gate.",
      "A path runs from the pink gate to the stone wall.",
      "A path runs from the climbing tree to the orange gate.",
      "A path runs from the orange gate to the red bench.",
      "A path runs from the climbing tree to the white gate.",
      "A path runs from the white gate to the old well.",
      "A path runs from the climbing tree to the black gate.",
      "A path runs from the black gate to the tree house.",
      "A path runs from the climbing tree to the grey gate.",
      "A path runs from the grey gate to the flagpole.",
      "A path runs from the duck pond to the gate with a star.",
      "A path runs from the gate with a star to the sandpit.",
      "A path runs from the sandpit to the gate with a moon.",
      "A path runs from the gate with a moon to the little bridge.",
      "A path runs from the little bridge to the gate with a sun.",
      "A path runs from the gate with a sun to the big slide.",
      "A path runs from the big slide to the gate with a leaf.",
      "A path runs from the gate with a leaf to the picnic table.",
      "A path runs from the picnic table to the gate with a heart.",
      "A path runs from the gate with a heart to the duck pond.",
      "A path runs from the stone wall to the gate with a fish.",
      "A path runs from the gate with a fish to the red bench.",
      "A path runs from the red bench to the gate with a frog.",
      "A path runs from the gate with a frog to the old well.",
      "A path runs from the old well to the gate with a bee.",
      "A path runs from the gate with a bee to the tree house.",
      "A path runs from the tree house to the gate with a fox.",
      "A path runs from the gate with a fox to the flagpole.",
      "A path runs from the flagpole to the gate with a snail.",
      "A path runs from the gate with a snail to the stone wall.",
      "A path runs from the duck pond to the gate with an apple.",
      "A path runs from the gate with an apple to the stone wall.",
      "A path runs from the duck pond to the gate with a pear.",
      "A path runs from the gate with a pear to the flagpole.",
      "A path runs from the sandpit to the gate with a kite.",
      "A path runs from the gate with a kite to the red bench.",
      "A path runs from the sandpit to the gate with a hat.",
      "A path runs from the gate with a hat to the stone wall.",
      "A path runs from the little bridge to the gate with a shoe.",
      "A path runs from the gate with a shoe to the old well.",
      "A path runs from the little bridge to the gate with a sock.",
      "A path runs from the gate with a sock to the red bench.",
      "A path runs from the big slide to the gate with a bell.",
      "A path runs from the gate with a bell to the tree house.",
      "A path runs from the big slide to the gate with a cup.",
      "A path runs from the gate with a cup to the old well.",
      "A path runs from the picnic table to the gate with a cake.",
      "A path runs from the gate with a cake to the flagpole.",
      "A path runs from the picnic table to the gate with a shell.",
      "A path runs from the gate with a shell to the tree house.",
      "A shortcut joins the gate with a fish to the pink gate.",
      "A shortcut joins the gate with a fish to the orange gate.",
      "A shortcut joins the pink gate to the orange gate.",
      "A shortcut joins the gate with a fish to the gate with a hat.",
      "A shortcut joins the gate with a fish to the gate with a kite.",
      "A shortcut joins the gate with a hat to the gate with a kite.",
      "A shortcut joins the gate with a snail to the pink gate.",
      "A shortcut joins the gate with a snail to the grey gate.",
      "A shortcut joins the pink gate to the grey gate.",
      "A shortcut joins the gate with a snail to the gate with an apple.",
      "A shortcut joins the gate with a snail to the gate with a pear.",
      "A shortcut joins the gate with an apple to the gate with a pear.",
      "A shortcut joins the gate with an apple to the gate with a hat.",
      "A shortcut joins the gate with an apple to the gate with a star.",
      "A shortcut joins the gate with a hat to the gate with a star.",
      "A shortcut joins the gate with a frog to the orange gate.",
      "A shortcut joins the gate with a frog to the white gate.",
      "A shortcut joins the orange gate to the white gate.",
      "A shortcut joins the gate with a frog to the gate with a sock.",
      "A shortcut joins the gate with a frog to the gate with a shoe.",
      "A shortcut joins the gate with a sock to the gate with a shoe.",
      "A shortcut joins the gate with a kite to the gate with a sock.",
      "A shortcut joins the gate with a kite to the gate with a moon.",
      "A shortcut joins the gate with a sock to the gate with a moon.",
      "A shortcut joins the gate with a bee to the white gate.",
      "A shortcut joins the gate with a bee to the black gate.",
      "A shortcut joins the white gate to the black gate.",
      "A shortcut joins the gate with a bee to the gate with a cup.",
      "A shortcut joins the gate with a bee to the gate with a bell.",
      "A shortcut joins the gate with a cup to the gate with a bell.",
      "A shortcut joins the gate with a shoe to the gate with a cup.",
      "A shortcut joins the gate with a shoe to the gate with a sun.",
      "A shortcut joins the gate with a cup to the gate with a sun.",
      "A shortcut joins the gate with a fox to the black gate.",
      "A shortcut joins the gate with a fox to the grey gate.",
      "A shortcut joins the black gate to the grey gate.",
      "A shortcut joins the gate with a fox to the gate with a shell.",
      "A shortcut joins the gate with a fox to the gate with a cake.",
      "A shortcut joins the gate with a shell to the gate with a cake.",
      "A shortcut joins the gate with a bell to the gate with a shell.",
      "A shortcut joins the gate with a bell to the gate with a leaf.",
      "A shortcut joins the gate with a shell to the gate with a leaf.",
      "A shortcut joins the gate with a pear to the gate with a cake.",
      "A shortcut joins the gate with a pear to the gate with a heart.",
      "A shortcut joins the gate with a cake to the gate with a heart.",
      "A shortcut joins the red gate to the blue gate.",
      "A shortcut joins the red gate to the gate with a star.",
      "A shortcut joins the blue gate to the gate with a star.",
      "A shortcut joins the red gate to the purple gate.",
      "A shortcut joins the red gate to the gate with a heart.",
      "A shortcut joins the purple gate to the gate with a heart.",
      "A shortcut joins the blue gate to the green gate.",
      "A shortcut joins the blue gate to the gate with a moon.",
      "A shortcut joins the green gate to the gate with a moon.",
      "A shortcut joins the green gate to the yellow gate.",
      "A shortcut joins the green gate to the gate with a sun.",
      "A shortcut joins the yellow gate to the gate with a sun.",
      "A shortcut joins the yellow gate to the purple gate.",
      "A shortcut joins the yellow gate to the gate with a leaf.",
      "A shortcut joins the purple gate to the gate with a leaf."
    ],
    "teacherNote": "In this mesh, thirty inserted positions split thirty original edges into sixty segments. Sixty more connections join the inserted positions within the original faces, giving forty-two positions, eighty faces and 120 relationships. The exercise uses those connections to record compatibility requirements, including ones that still need checking.",
    "teacherExample": "Follow the service brief through its stated safety commitment to a particular safety target. Now inspect where that commitment must be compatible with access. Name the specific requirement you would check.",
    "abstract": {
      "definition": "Resolution is the detail at which a model can distinguish alternatives. In the geodesic mesh, each original edge is split at a midpoint. Measuring that new position can distinguish paths that give the same end-to-end measurement.",
      "label": "Check",
      "check": "A path ends 6 m above its start. A rise of 3 m followed by another 3 m fits the measurement. So does a rise of 9 m followed by a fall of 3 m. A midpoint measurement distinguishes those two profiles. Drawing the midpoint alone supplies no new evidence."
    }
  },
  "sphere": {
    "name": "Wholeness",
    "why": "Hold the network as one whole, then explore it from different starting points. See whether you can find the same connection again.",
    "example": "Use the same refined park map. From the oak tree, follow the path to the red gate; from the duck pond, follow the other segment back to that gate. Both journeys locate the same part of the network.",
    "check": "If the gate-to-pond segment closes, can you identify the same closure from either starting point?",
    "note": "The model contains the same relationships as the geodesic stage. The exercise is to recover their place in the whole from different starting points.",
    "teacherNote": "The sphere retains the geodesic exercise’s 120 relationships. The change is in how you recover and use them. Circle holds a single relationship as a whole. Sphere holds a whole from which you can recover a particular part, its neighbours and its limits.",
    "teacherExample": "Enter the ferry model through safety and locate a requirement that affects access. Begin again through accessibility and recover the same requirement, including any unresolved tension.",
    "abstract": {
      "definition": "Wholeness means the same model can be recovered consistently from different starting points. Sphere uses the same 120 relationships as the geodesic mesh. The new task is to recover a particular dependency and its consequences from more than one entry point.",
      "label": "Recovery test",
      "check": "Suppose the path between the red gate and the duck pond closes. Start at the gate, then at the pond. Both accounts must identify the same blocked path. Choose a planned walk that used it and one that avoided it. Only the first needs a detour because of this closure. Repeat with other paths to test how much of the model you can recover."
    }
  }
};

  const HEART_SHAPES = {
  "circle": {
    "name": "Awareness in the heart",
    "label": "Heart awareness",
    "prompt": "Rest your awareness in the centre of your heart. Soften your chest and let the felt quality of love come forward. Breathe gently and stay with whatever you notice.",
    "practice": "Let awareness rest in the heart itself. Stay with the feeling as it emerges and changes.",
    "reflection": "What does love feel like in the heart right now? If it is subtle, stay with the subtlety without forcing it."
  },
  "half-circle": {
    "name": "Awareness and attention",
    "label": "Awareness · heart",
    "prompt": "Begin with love in the heart. Notice awareness itself, then notice where your attention rests on the heart. Gently move between the two while keeping the feeling available.",
    "practice": "Distinguish the wider field of awareness from its focus on the heart; notice how the two relate as you breathe.",
    "reflection": "Does your attention feel narrow or open? What changes in the feeling of love when awareness and heart focus meet?"
  },
  "triangle": {
    "name": "Heart, body and mind",
    "label": "Heart · body · mind",
    "prompt": "Begin with love in the heart. Notice your body and your thoughts alongside it, and gently bring your attention, body and mind into relationship with the feeling.",
    "practice": "Let the felt quality of love be present as you notice the rest of your body. If attention wanders into thought, return to the heart and reconnect without strain.",
    "reflection": "How does your body feel alongside the love in your heart? Does your mind feel settled, distracted or something else?"
  },
  "square": {
    "name": "Deepening love",
    "label": "Deepening",
    "prompt": "Begin with love in the heart and the connection between heart, body and mind. Gently lean into the feeling, allowing it to deepen or extend without forcing it.",
    "practice": "Stay with the quality you recognise. Give it room to develop through the breath, and notice whether it becomes fuller while remaining easy.",
    "reflection": "Is the feeling becoming fuller, subtler or staying the same? How does your body respond as you stay with it?"
  },
  "pentagon": {
    "name": "Intensity",
    "label": "Intensity",
    "prompt": "Bring love forward in the heart and notice its strength. Allow it to deepen gently or remain subtle, while staying connected to your body and mind.",
    "practice": "Explore intensity as a quality of your experience, not a target to achieve. Let your attention make room for changes rather than trying to manufacture them.",
    "reflection": "How strong or subtle is the feeling now? Does it stay comfortable as its intensity changes?"
  },
  "hexagon": {
    "name": "Time and rhythm",
    "label": "Rhythm",
    "prompt": "Sustain love in the heart across several natural breaths. Notice whether the felt signal stays steady, pulses, fades or returns.",
    "practice": "Let the breath support attention to the feeling. When it changes or fades, gently return to the heart and allow it to arise again.",
    "reflection": "How does the feeling change over time? Does it relate to the rhythm of your breathing?"
  },
  "heptagon": {
    "name": "Movement",
    "label": "Movement",
    "prompt": "Begin with love in the heart. Follow any movement or spreading of the feeling through the body, while keeping a connection with the heart.",
    "practice": "Notice movement if it is present; there is no need to make it move. You can return to the heart whenever your attention drifts.",
    "reflection": "Does the feeling stay in one place, spread or move? What changes where you notice it?"
  },
  "octagon": {
    "name": "Direction",
    "label": "Direction",
    "prompt": "As you sustain love in the heart, notice whether the feeling seems to move in a direction through your body. Let the movement be easy and unforced.",
    "practice": "Use the direction you notice as a guide for attention, then return to the heart and sense the connection again. Stillness is an experience too.",
    "reflection": "If the feeling moves, which way does it travel? What is different when it feels still?"
  },
  "prism": {
    "name": "Felt tone",
    "label": "Felt tone",
    "prompt": "Keep love in the heart and notice its felt tone alongside other sensations in your body. Allow mixed or subtle qualities to be present.",
    "practice": "Explore how the heart feeling and the rest of your experience sit together, without needing to change either one.",
    "reflection": "Does love feel warm, quiet, open or different today? Are other sensations pleasant, uncomfortable, neutral or mixed?"
  },
  "cube": {
    "name": "Impulse and choice",
    "label": "Impulse",
    "prompt": "Sustain love from the heart and notice any impulse it brings: a change in posture, a wish to move or a possible action.",
    "practice": "Notice the impulse as part of the experience. Keep the feeling in awareness and give yourself space to choose whether to respond.",
    "reflection": "What does this feeling incline you to do? Can you remain with it before choosing an action?"
  },
  "dodecahedron": {
    "name": "Coherence",
    "label": "Coherence",
    "prompt": "Bring love to awareness in the heart and notice how it relates to your body, thoughts and impulses. Let the parts of the experience come together gently.",
    "practice": "If one part feels different or unsettled, notice that too. Reconnect with the heart and observe what becomes more or less aligned.",
    "reflection": "Which parts of your experience feel in harmony? Is any part asking for a different kind of attention?"
  },
  "icosahedron": {
    "name": "Meaning",
    "label": "Meaning",
    "prompt": "Begin with the felt experience of love in the heart. Notice what meaning you give it while remaining in touch with the sensation itself.",
    "practice": "Let meaning emerge from the experience. You can explore more than one understanding while keeping the heart feeling present.",
    "reflection": "What does this feeling mean to you now? Does a different interpretation change how you experience it?"
  },
  "geodesic": {
    "name": "Clarity and uncertainty",
    "label": "Clarity",
    "prompt": "Return to love in the heart and distinguish what you can directly feel from what you are interpreting or expecting.",
    "practice": "Notice the qualities that are clear and allow uncertainty where the experience is less distinct. Keep the practice gentle.",
    "reflection": "What can you feel directly? What are you unsure about, and does that change as you stay with the heart?"
  },
  "sphere": {
    "name": "Whole-body responsiveness",
    "label": "Wholeness",
    "prompt": "Begin in the heart and let love be present as you include the whole body, your thoughts and your capacity to respond. Move between the heart and the whole experience with ease.",
    "practice": "Bring together the awareness, attention, quality, intensity, rhythm and other distinctions you have practised. Return to the heart whenever you wish to re-establish the feeling.",
    "reflection": "How does the whole experience respond when your attention returns to the heart? What helps the feeling remain available as you move through your experience?"
  }
};

  const LOCI_COURSE = [
  {
    "route": "oscillatory",
    "title": "Encode an entry",
    "description": "Give an experience a home in your memory palace. As the shapes progress, build cues around that same entry and practise what each cue brings back.",
    "first": "Choose a place for the first experience that arises. On the exhale, picture it there.",
    "firstExample": "Now encode a pencil at your doorstep. Let its point touch the step.",
    "lessons": {
      "circle": {
        "name": "Placement",
        "prompt": "Choose one place in your memory palace. On the exhale, place the experience there.",
        "example": "Imagine your front doorstep. Now encode a pencil there. Picture its point resting against the step.",
        "check": "On another breath, visit the doorstep. What did you put there?",
        "labels": []
      },
      "half-circle": {
        "name": "Distinction",
        "prompt": "Keep the pencil in its place and give it one cue of your own. Distinguish the action that starts recall from the pencil it brings back.",
        "example": "At the doorstep, imagine a pencil case. Forge one connection to the pencil. Opening the lid makes the pencil rise.",
        "check": "Picture the lid opening. Can you recall what rises?",
        "labels": [
          {
            "label": "Lid lifts pencil",
            "cue": "Open the case at the doorstep. Picture the pencil rising."
          }
        ]
      },
      "triangle": {
        "name": "System",
        "prompt": "Give the same experience three connections that work together. Make the result of one connection set up the next.",
        "example": "Keep the pencil at the doorstep. Opening the case lifts the pencil. Once upright, the pencil draws a line. When its tip reaches the end, it shuts the lid and slips back inside. You can run the sequence again by opening the case.",
        "check": "Hold the lid shut in imagination. Which later actions can still happen?",
        "labels": [
          {
            "label": "Lid lifts pencil",
            "cue": "Open the case at the doorstep. Picture the pencil rising."
          },
          {
            "label": "Pencil draws",
            "cue": "Let the raised pencil draw its line."
          },
          {
            "label": "Tip shuts lid",
            "cue": "Let the tip shut the case when the stroke ends."
          }
        ]
      },
      "square": {
        "name": "Network",
        "prompt": "Give the triangle’s system a fourth connection that opens another route through it.",
        "example": "At the doorstep, let the word “write” also raise the pencil. Opening the case or saying the word can now start the stroke. Both routes lead to the same line and the same closing lid.",
        "check": "Imagine the lid can no longer lift the pencil. How else could you start the stroke?",
        "labels": [
          {
            "label": "Lid lifts pencil",
            "cue": "Open the case at the doorstep. Picture the pencil rising."
          },
          {
            "label": "Pencil draws",
            "cue": "Let the raised pencil draw its line."
          },
          {
            "label": "Tip shuts lid",
            "cue": "Let the tip shut the case when the stroke ends."
          },
          {
            "label": "Voice lifts pencil",
            "cue": "Say “write” in imagination and let the pencil rise."
          }
        ]
      },
      "pentagon": {
        "name": "Perspective",
        "prompt": "Give the same experience a fifth connection that lets you recover a route from its other end.",
        "example": "Have the pencil mark the start of its line with a dot if the lid raised it or a star if your voice raised it. From the pencil’s starting position you can predict the mark. From the finished drawing you can read back how the pencil started.",
        "check": "Imagine a star on the line. Which route led to it?",
        "labels": [
          {
            "label": "Lid lifts pencil",
            "cue": "Open the case at the doorstep. Picture the pencil rising."
          },
          {
            "label": "Pencil draws",
            "cue": "Let the raised pencil draw its line."
          },
          {
            "label": "Tip shuts lid",
            "cue": "Let the tip shut the case when the stroke ends."
          },
          {
            "label": "Voice lifts pencil",
            "cue": "Say “write” in imagination and let the pencil rise."
          },
          {
            "label": "Start mark",
            "cue": "Read the dot or star to recover what raised the pencil."
          }
        ]
      },
      "hexagon": {
        "name": "Mediation",
        "prompt": "Give the experience a sixth connection that carries or changes the effect of another connection.",
        "example": "Slip a curved stencil under the pencil. The starting cue still raises it, but the stencil now steers its tip. Rotate the stencil at the doorstep and picture how the same cue produces a different stroke.",
        "check": "How could you alter the line while keeping its starting cue?",
        "labels": [
          {
            "label": "Lid lifts pencil",
            "cue": "Open the case at the doorstep. Picture the pencil rising."
          },
          {
            "label": "Pencil draws",
            "cue": "Let the raised pencil draw its line."
          },
          {
            "label": "Tip shuts lid",
            "cue": "Let the tip shut the case when the stroke ends."
          },
          {
            "label": "Voice lifts pencil",
            "cue": "Say “write” in imagination and let the pencil rise."
          },
          {
            "label": "Start mark",
            "cue": "Read the dot or star to recover what raised the pencil."
          },
          {
            "label": "Stencil guides tip",
            "cue": "Turn the stencil and watch the tip follow its curve."
          }
        ]
      },
      "heptagon": {
        "name": "Context",
        "prompt": "Give the experience a seventh connection that sets a condition for an existing action.",
        "example": "Let the surface change how the pencil follows the stencil. On plain paper it traces a smooth curve. On squared paper it traces the curve in little steps along the grid. Keep the starting cue and stencil the same as you switch surfaces.",
        "check": "Which part of the stroke depends on the surface beneath the pencil?",
        "labels": [
          {
            "label": "Lid lifts pencil",
            "cue": "Open the case at the doorstep. Picture the pencil rising."
          },
          {
            "label": "Pencil draws",
            "cue": "Let the raised pencil draw its line."
          },
          {
            "label": "Tip shuts lid",
            "cue": "Let the tip shut the case when the stroke ends."
          },
          {
            "label": "Voice lifts pencil",
            "cue": "Say “write” in imagination and let the pencil rise."
          },
          {
            "label": "Start mark",
            "cue": "Read the dot or star to recover what raised the pencil."
          },
          {
            "label": "Stencil guides tip",
            "cue": "Turn the stencil and watch the tip follow its curve."
          },
          {
            "label": "Surface sets rule",
            "cue": "Change from plain paper to squared paper and trace how the stroke changes."
          }
        ]
      },
      "octagon": {
        "name": "Parallel paths",
        "prompt": "Give the experience an eighth connection that lets one action produce two results you can follow separately.",
        "example": "Imagine a wax sheet beneath the paper. As the pencil follows the curve, it leaves a graphite line above and presses a groove below. Lift the paper and trace the same curve in the wax with your fingertip.",
        "check": "If the graphite smudges, which route still recovers the pencil’s movement?",
        "labels": [
          {
            "label": "Lid lifts pencil",
            "cue": "Open the case at the doorstep. Picture the pencil rising."
          },
          {
            "label": "Pencil draws",
            "cue": "Let the raised pencil draw its line."
          },
          {
            "label": "Tip shuts lid",
            "cue": "Let the tip shut the case when the stroke ends."
          },
          {
            "label": "Voice lifts pencil",
            "cue": "Say “write” in imagination and let the pencil rise."
          },
          {
            "label": "Start mark",
            "cue": "Read the dot or star to recover what raised the pencil."
          },
          {
            "label": "Stencil guides tip",
            "cue": "Turn the stencil and watch the tip follow its curve."
          },
          {
            "label": "Surface sets rule",
            "cue": "Change from plain paper to squared paper and trace how the stroke changes."
          },
          {
            "label": "Groove underneath",
            "cue": "Lift the paper and follow the pencil’s groove in the wax."
          }
        ]
      },
      "prism": {
        "name": "Correspondence",
        "prompt": "Organise connections around the same experience into two three-part systems. Add a bridge between each pair of matching roles.",
        "example": "At the doorstep, build a visible trace and a felt trace. In each, the pencil starts a trail, the stencil guides its course and the trail’s end cues a return to the pencil. Match the graphite start with the groove’s start, their curves with each other, and their ends with each other.",
        "check": "Enter through the groove’s curve. Which bridge brings you to the corresponding part of the graphite line?",
        "labels": [
          {
            "label": "Line starts",
            "cue": "Recover the first graphite mark where the pencil touched the sheet."
          },
          {
            "label": "Line curves",
            "cue": "Trace the line where the stencil turned the pencil."
          },
          {
            "label": "Line returns",
            "cue": "Follow the end of the graphite line back to the pencil that drew it."
          },
          {
            "label": "Groove starts",
            "cue": "Find the first dent made by the pencil in the wax."
          },
          {
            "label": "Groove curves",
            "cue": "Feel the bend pressed into the wax under the stencil."
          },
          {
            "label": "Groove returns",
            "cue": "Follow the groove’s end back to the pencil that pressed it."
          },
          {
            "label": "Match starts",
            "cue": "Match the first graphite mark to the first dent below it."
          },
          {
            "label": "Match curves",
            "cue": "Trace the visible curve and find its counterpart by touch."
          },
          {
            "label": "Match ends",
            "cue": "Lift the paper where the graphite stops. Find the groove’s end."
          }
        ]
      },
      "cube": {
        "name": "Alignment",
        "prompt": "Add a checking step to each trace. Match all four roles across the two traces, including the effect of each check.",
        "example": "Follow the pencil’s visible trail from its start, along its curve, to its end. Inspect it with your eye. Follow the wax trail the same way and check it with a fingertip. Match the starts, curves, ends and checks. Use the felt groove to guide the pencil where the graphite line has smudged.",
        "check": "If the stencil turned halfway through the stroke, where should both checks find the turn?",
        "labels": [
          {
            "label": "Line starts",
            "cue": "Recover the first graphite mark where the pencil touched the sheet."
          },
          {
            "label": "Line curves",
            "cue": "Trace the line where the stencil turned the pencil."
          },
          {
            "label": "Line ends",
            "cue": "Find where the pencil left the surface of the page."
          },
          {
            "label": "Eye checks",
            "cue": "Look for a gap in the graphite trail and bring the tip back to it."
          },
          {
            "label": "Groove starts",
            "cue": "Find the first dent made by the pencil in the wax."
          },
          {
            "label": "Groove curves",
            "cue": "Feel the bend pressed into the wax under the stencil."
          },
          {
            "label": "Groove ends",
            "cue": "Find where the pressure of the tip disappeared from the wax."
          },
          {
            "label": "Finger checks",
            "cue": "Check the groove with your fingertip. Feel for an interruption."
          },
          {
            "label": "Match starts",
            "cue": "Match the first graphite mark to the first dent below it."
          },
          {
            "label": "Match curves",
            "cue": "Trace the visible curve and find its counterpart by touch."
          },
          {
            "label": "Match ends",
            "cue": "Lift the paper where the graphite stops. Find the groove’s end."
          },
          {
            "label": "Match checks",
            "cue": "Use the fingertip’s route to guide the eye back to a smudge in the line."
          }
        ]
      },
      "dodecahedron": {
        "name": "Architecture",
        "prompt": "Join groups of associations around the same experience by giving neighbouring groups a shared connection. Work on one neighbouring pair at a time.",
        "example": "Build a five-link loop around the pencil. The tip follows the stencil, the stencil shapes the line, the line guides your eye, your eye finds a gap, and the gap calls the pencil back. Build a second loop through the same tip and stencil, then through the wax groove, your fingertip and a bump that calls the pencil back. The tip following the stencil belongs to both loops.",
        "check": "Start with the gap in the line. Which shared connection lets you cross into the groove?",
        "labels": [
          {
            "label": "Shared stencil",
            "cue": "Return to the tip following the stencil. Choose either the graphite loop or the wax loop."
          },
          {
            "label": "Visible loop",
            "cue": "Travel from pencil to stencil, line, eye and gap, then return to the pencil."
          },
          {
            "label": "Felt loop",
            "cue": "Travel from pencil to stencil, groove, fingertip and bump, then return to the pencil."
          }
        ]
      },
      "icosahedron": {
        "name": "Duality",
        "prompt": "Treat each group you built as one position. A connection shared by two groups now gives you a route between the groups themselves.",
        "example": "Give the pencil a third job, repairing the two copies. Let both the gap in the line and the bump in the wax cue the pencil to repair them. Now follow the groups. Drawing leads to embossing through the stencil. Embossing leads to repair through the bump. Repair leads back to drawing through the gap. The three jobs form a triangle.",
        "check": "Can you travel from drawing to repair directly, then take the longer route through embossing?",
        "labels": [
          {
            "label": "Drawing ↔ embossing",
            "cue": "Use the shared stencil to pass between drawing and embossing."
          },
          {
            "label": "Embossing ↔ repair",
            "cue": "Use the bump in the wax to enter the repair group."
          },
          {
            "label": "Repair ↔ drawing",
            "cue": "Use the gap in the line to move between repair and drawing."
          }
        ]
      },
      "geodesic": {
        "name": "Resolution",
        "prompt": "Refine a connection within a group by giving it a more precise intermediate cue. Keep both the broad route and its detail available.",
        "example": "Return to the gap that calls the pencil back. Imagine a red arrow pointing from the gap to the exact place for the tip to land. At a glance, the gap means “repair”. Up close, follow gap → arrow → landing point to recover where repair begins.",
        "check": "Move the arrow to the far end of the gap. Which detail of the pencil’s repair changes?",
        "labels": [
          {
            "label": "Broad cue",
            "cue": "Let the gap bring the whole repair action to mind."
          },
          {
            "label": "Exact cue",
            "cue": "Trace the arrow from the gap to the precise landing point for the pencil tip."
          },
          {
            "label": "Detail changes",
            "cue": "Turn the arrow around and recover the changed landing point."
          }
        ]
      },
      "sphere": {
        "name": "Wholeness",
        "prompt": "Recover the same working pattern through different associations around the original experience. Use one detail to check that the routes agree.",
        "example": "Enter by the pencil case at the doorstep. Follow the pencil through the stroke to the gap and its red arrow. Next enter by the wax groove. Follow the shared stencil to the line, find the gap and recover the same arrow. From either entry, place the pencil tip where repair should begin.",
        "check": "From each starting cue, can you recover the same landing point and explain how you got there?",
        "labels": [
          {
            "label": "Case entry",
            "cue": "Enter through the case and recover the gap and its arrow along the graphite route."
          },
          {
            "label": "Wax entry",
            "cue": "Enter through the groove and reach the same arrow by way of the stencil."
          },
          {
            "label": "Cross-check",
            "cue": "Starting from each route, place the pencil tip where the repair begins."
          }
        ]
      }
    }
  },
  {
    "route": "oscillatory-connections",
    "title": "Connect palace entries",
    "description": "Start by recalling each entry from its place. In the later shapes, invent cues that carry you from one stored entry to another. Follow a cue and see what it brings back.",
    "first": "Visit a place in your palace and recall its entry. If you are starting a new palace, place your first experience there on the exhale.",
    "firstExample": "Place a pencil at the doorway. On a later visit, picture the doorway and call the pencil to mind.",
    "lessons": {
      "circle": {
        "name": "Recall by place",
        "prompt": "Choose a location for an experience that arises in your stream. Let that location be your cue for recalling the experience.",
        "example": "Place a pencil in the doorway of your memory palace. Later, return in imagination to the doorway and recover the pencil.",
        "check": "When you visit the doorway, what comes back?",
        "labels": []
      },
      "half-circle": {
        "name": "Distinction",
        "prompt": "Give one stored experience a cue that retrieves another at its own location. Distinguish the cue you send from the memory it calls up.",
        "example": "When a bell has a place on your shelf, return to your pencil at the doorway. Imagine its tip drawing a bell. As the drawing takes shape, go to the shelf and hear the bell there.",
        "check": "Start at the pencil. Which detail tells you where to go next?",
        "labels": [
          {
            "label": "Draw the bell",
            "cue": "At the doorway, draw the bell with the pencil and visit its shelf."
          }
        ]
      },
      "triangle": {
        "name": "System",
        "prompt": "Make three connections that work in a loop. What comes back at one location supplies the cue for the next, until the last memory starts the sequence again.",
        "example": "Use the pencil at your doorway, the bell on your shelf and a lamp at your window. Let the pencil draw the bell, the bell’s ring light the lamp, and the lamp cast a pencil-shaped shadow back at the doorway. The shadow cues the next stroke.",
        "check": "Imagine the bell stays silent. Which part of the loop stops receiving its cue?",
        "labels": [
          {
            "label": "Draw the bell",
            "cue": "At the doorway, draw the bell with the pencil and visit its shelf."
          },
          {
            "label": "Ring for light",
            "cue": "At the shelf, let the bell ring and see the lamp light up at its own location."
          },
          {
            "label": "Cast the pencil",
            "cue": "At the lamp, let its shadow take the shape of the pencil in the doorway."
          }
        ]
      },
      "square": {
        "name": "Network",
        "prompt": "Give a memory two routes to the same destination. Use four connections so each route has its own intermediate cue.",
        "example": "At the pencil, choose a cue. Draw a bell and follow its ring to the lamp. Or draw a star on a map in your palace and follow the star to the same lamp. You now have two ways to retrieve the lamp from the pencil.",
        "check": "If the ringing no longer brings the lamp to mind, can you still reach it through the map?",
        "labels": [
          {
            "label": "Draw the bell",
            "cue": "At the doorway, draw the bell with the pencil and visit its shelf."
          },
          {
            "label": "Ring for light",
            "cue": "At the shelf, let the bell ring and see the lamp light up at its own location."
          },
          {
            "label": "Mark the map",
            "cue": "At the pencil, draw a star that appears on the map at its location."
          },
          {
            "label": "Follow the star",
            "cue": "At the map, follow its star to the lit lamp."
          }
        ]
      },
      "pentagon": {
        "name": "Perspective",
        "prompt": "Give the destination a fifth connection back to the starting point. Change where you enter the network and recover what each memory does from that position.",
        "example": "Keep both pencil-to-lamp routes, one through the bell and one through the map. Give the lamp a pencil-shaped shadow that calls you back to the doorway. From the pencil you choose a route. From the lamp you receive either route and send the next cue.",
        "check": "Enter at the lamp. What brings you there, and what can you call up from there?",
        "labels": [
          {
            "label": "Draw the bell",
            "cue": "At the doorway, draw the bell with the pencil and visit its shelf."
          },
          {
            "label": "Ring for light",
            "cue": "At the shelf, let the bell ring and see the lamp light up at its own location."
          },
          {
            "label": "Mark the map",
            "cue": "At the pencil, draw a star that appears on the map at its location."
          },
          {
            "label": "Follow the star",
            "cue": "At the map, follow its star to the lit lamp."
          },
          {
            "label": "Cast the pencil",
            "cue": "At the lamp, let its shadow take the shape of the pencil in the doorway."
          }
        ]
      },
      "hexagon": {
        "name": "Mediation",
        "prompt": "Develop six connections by giving one route a relay. Let an intermediate memory translate the cue it receives into a different cue.",
        "example": "Keep the map route and the lamp’s shadow returning to the pencil. Change the bell route. Let the bell shake a mirror at another location, then let its flash light the lamp. Sound calls up the mirror, and reflected light calls up the lamp.",
        "check": "Start with the ring. Which memory turns it into the cue that retrieves the lamp?",
        "labels": [
          {
            "label": "Draw the bell",
            "cue": "At the doorway, draw the bell with the pencil and visit its shelf."
          },
          {
            "label": "Shake the mirror",
            "cue": "At the bell, let its ring shake the mirror at its location."
          },
          {
            "label": "Reflect light",
            "cue": "At the mirror, see the shaking glass flash and call up the lamp."
          },
          {
            "label": "Mark the map",
            "cue": "At the pencil, draw a star that appears on the map at its location."
          },
          {
            "label": "Follow the star",
            "cue": "At the map, follow its star to the lit lamp."
          },
          {
            "label": "Cast the pencil",
            "cue": "At the lamp, let its shadow take the shape of the pencil in the doorway."
          }
        ]
      },
      "heptagon": {
        "name": "Context",
        "prompt": "Give a seventh connection a condition. The context you choose determines when another route is useful.",
        "example": "Keep the pencil, bell, mirror, lamp and map routes. Visit a clock stored elsewhere in your palace. Make its noon chime wake the star on the map. At noon, the map gives a clear route to the lamp. At other times, use the bell and mirror.",
        "check": "Picture the clock at noon and then at dusk. Which route works in each setting?",
        "labels": [
          {
            "label": "Draw the bell",
            "cue": "At the doorway, draw the bell with the pencil and visit its shelf."
          },
          {
            "label": "Shake the mirror",
            "cue": "At the bell, let its ring shake the mirror at its location."
          },
          {
            "label": "Reflect light",
            "cue": "At the mirror, see the shaking glass flash and call up the lamp."
          },
          {
            "label": "Mark the map",
            "cue": "At the pencil, draw a star that appears on the map at its location."
          },
          {
            "label": "Follow the star",
            "cue": "At the map, follow its star to the lit lamp."
          },
          {
            "label": "Cast the pencil",
            "cue": "At the lamp, let its shadow take the shape of the pencil in the doorway."
          },
          {
            "label": "Noon wakes the map",
            "cue": "At the clock, let its noon chime wake the star on the map."
          }
        ]
      },
      "octagon": {
        "name": "Parallelism",
        "prompt": "Coordinate two routes with eight connections. Give each route its own start signal, let them run separately and recover where they meet.",
        "example": "Keep noon as the clock’s cue for the map. Give dusk a second cue from the clock, a chime that rings the bell. Follow the map’s star to the lamp on one pass and the bell’s ring through the mirror to the lamp on another. The pencil can still call up either route.",
        "check": "Which cue belongs to both routes at their destination? Which cues belong to just one route?",
        "labels": [
          {
            "label": "Draw the bell",
            "cue": "At the doorway, draw the bell with the pencil and visit its shelf."
          },
          {
            "label": "Shake the mirror",
            "cue": "At the bell, let its ring shake the mirror at its location."
          },
          {
            "label": "Reflect light",
            "cue": "At the mirror, see the shaking glass flash and call up the lamp."
          },
          {
            "label": "Mark the map",
            "cue": "At the pencil, draw a star that appears on the map at its location."
          },
          {
            "label": "Follow the star",
            "cue": "At the map, follow its star to the lit lamp."
          },
          {
            "label": "Cast the pencil",
            "cue": "At the lamp, let its shadow take the shape of the pencil in the doorway."
          },
          {
            "label": "Noon wakes the map",
            "cue": "At the clock, let its noon chime wake the star on the map."
          },
          {
            "label": "Dusk rings the bell",
            "cue": "At the clock, let dusk set the bell ringing on the shelf."
          }
        ]
      },
      "prism": {
        "name": "Correspondence",
        "prompt": "Give two three-link systems three bridges. Match memories that do the same job so you can move between the systems at that point.",
        "example": "Make the pencil draw the bell, the bell light the lamp, and the lamp cast the pencil’s shadow. At other loci, make a drum wake a bird, the bird call up the sun, and the sun dry the drumskin for another beat. Pair pencil with drum as starters, bell with bird as callers, and lamp with sun as lights.",
        "check": "Start at the bell and cross to the bird. What should the bird call up next?",
        "labels": [
          {
            "label": "Draw",
            "cue": "Draw the bell with the pencil."
          },
          {
            "label": "Ring",
            "cue": "Let the ringing bell light the lamp."
          },
          {
            "label": "Cast a shadow",
            "cue": "Make the lamp cast the pencil’s shadow."
          },
          {
            "label": "Beat",
            "cue": "Let a beat of the drum wake the bird."
          },
          {
            "label": "Call",
            "cue": "Let the bird call up the sun."
          },
          {
            "label": "Dry the skin",
            "cue": "Feel the sun dry the drumskin for another beat."
          },
          {
            "label": "Starters",
            "cue": "Cross from pencil to drum to start the other loop."
          },
          {
            "label": "Callers",
            "cue": "Cross from ringing bell to singing bird to recover the other call."
          },
          {
            "label": "Lights",
            "cue": "Cross from lamp to sun to find the light in the other loop."
          }
        ]
      },
      "cube": {
        "name": "Alignment",
        "prompt": "Match two four-link networks in four places. Use the bridges to predict how a route in one network continues in the other.",
        "example": "Let the pencil reach the lamp through the bell or the map. In another part of the palace, let a drum call up either a bird that sings to the sun or a compass whose needle points to the sun. Pair pencil–drum, bell–bird, map–compass and lamp–sun. A choice of sound or direction now carries over when you cross.",
        "check": "Take the map route, cross to the compass and follow its needle. Do you reach the counterpart of the lamp?",
        "labels": [
          {
            "label": "Draw bell",
            "cue": "Draw the bell with the pencil."
          },
          {
            "label": "Ring for lamp",
            "cue": "Let the bell’s ring bring back the lamp."
          },
          {
            "label": "Draw map",
            "cue": "Draw a star and see it appear on the map."
          },
          {
            "label": "Find lamp",
            "cue": "Let the map’s star show the way to the lamp."
          },
          {
            "label": "Beat for bird",
            "cue": "A quick drumbeat wakes the bird."
          },
          {
            "label": "Sing for sun",
            "cue": "The bird sings and the sun rises."
          },
          {
            "label": "Beat for compass",
            "cue": "A slow drumbeat turns the compass needle."
          },
          {
            "label": "Point to sun",
            "cue": "The needle points to the rising sun."
          },
          {
            "label": "Starters",
            "cue": "Move between pencil and drum to choose a route in either network."
          },
          {
            "label": "Sound cues",
            "cue": "Move between bell and bird to switch sound routes."
          },
          {
            "label": "Direction cues",
            "cue": "Move between map and compass to switch direction routes."
          },
          {
            "label": "Destinations",
            "cue": "Move between lamp and sun to check both destinations."
          }
        ]
      },
      "dodecahedron": {
        "name": "Architecture",
        "prompt": "Build five-link routes that share cues along their edges. A shared cue lets you cross from one whole route into its neighbour. Twelve neighbouring pentagons share thirty distinct connections.",
        "example": "Use a drawing route in which pencil calls bell, bell shakes mirror, mirror lights lamp, lamp reveals map and map guides pencil. Build a timing route around the same pencil-to-bell cue. This time the bell wakes a clock, the clock opens a gate, the gate frees a bird and the bird carries the pencil home.",
        "check": "When the pencil draws the bell, can you choose between the drawing route and the timing route?",
        "labels": [
          {
            "label": "Shared edges",
            "cue": "Bring back the pencil drawing the bell. Both pentagons use this connection."
          },
          {
            "label": "Neighbouring routes",
            "cue": "At the bell, recall what follows in Drawing and what follows in Timing."
          },
          {
            "label": "Crossings",
            "cue": "Follow the pencil to the bell in Drawing, then let it wake the clock in Timing."
          }
        ]
      },
      "icosahedron": {
        "name": "Duality",
        "prompt": "Give each five-link route a name. Treat each route as one place in a larger map and each shared cue as a crossing. A meeting of three routes becomes a triangle.",
        "example": "Name the two routes Drawing and Timing. For a Delivery pentagon, link map to road, road to parcel and parcel to bird. Close it with the bird carrying the pencil and the map guiding the pencil. Cross from Drawing to Timing at the drawn bell, from Timing to Delivery at the carrying bird, and from Delivery to Drawing at the guiding map.",
        "check": "Travel the triangle of route names. Can you recover the precise cue at each crossing?",
        "labels": [
          {
            "label": "Drawing",
            "cue": "Enter Drawing through the map guiding the pencil."
          },
          {
            "label": "Timing",
            "cue": "Enter Timing through the pencil drawing the bell."
          },
          {
            "label": "Delivery",
            "cue": "Enter Delivery through the bird carrying the pencil."
          }
        ]
      },
      "geodesic": {
        "name": "Resolution",
        "prompt": "Give each crossing a midpoint at a remembered location. Split a crossing into two steps and join the midpoints around a triangle. The full mesh has 120 connections across 80 small triangles.",
        "example": "Refine the Drawing-to-Timing crossing with a tuning fork at a stair. Let the pencil’s drawing of a bell wake the fork there. Give its hum the job of calling up the timing route’s bell. Give the other two crossings their own midpoints, then make a cue between each pair of midpoints.",
        "check": "At the stair, can you recover what calls up the tuning fork and what its hum calls up in turn?",
        "labels": [
          {
            "label": "Subdivide",
            "cue": "Let the drawing of the bell wake a tuning fork at a stair."
          },
          {
            "label": "Join midpoints",
            "cue": "Join the fork to the midpoints of both neighbouring crossings."
          },
          {
            "label": "Recover the crossing",
            "cue": "Follow the fork’s hum to the bell in the timing route."
          }
        ]
      },
      "sphere": {
        "name": "Wholeness",
        "prompt": "Use the same 120 connections from different starting locations. Check whether you can recover a dependency and its consequences wherever you enter.",
        "example": "Enter through the drawing pencil and follow the bell image to the tuning fork, then its hum into Timing. Enter again through the timing clock and trace back to the same fork. Imagine the fork falls silent. From either starting point you can recover the crossing that needs a new cue.",
        "check": "Choose a distant starting location. Can you recover the same interrupted crossing and find a route through Delivery?",
        "labels": [
          {
            "label": "Enter anywhere",
            "cue": "Enter through the clock and recover the timing bell."
          },
          {
            "label": "Trace dependence",
            "cue": "Trace the timing bell back through the fork to the drawing that set it humming."
          },
          {
            "label": "Find a detour",
            "cue": "When the fork falls silent, cross from Drawing to Delivery at the map and from Delivery to Timing at the bird."
          }
        ]
      }
    }
  },
  {
    "route": "oscillatory-combined",
    "title": "Combined practice",
    "description": "Give an entry its own cues, then use those cues to reach other entries at their places. Each shape gives you a way to organise the journey and test your return.",
    "first": "Choose a place in your palace. As the first experience arises, place it there on the exhale.",
    "firstExample": "Picture a pencil leaning against your doorway. Take a moment to fix its position in memory.",
    "lessons": {
      "circle": {
        "name": "Placement",
        "prompt": "Give the experience that arises a place of its own. Practise returning to that place and recalling what you put there.",
        "example": "Now encode a pencil at your doorway. Picture it leaning against the frame. Return to the doorway on a later breath and recall the pencil.",
        "check": "What comes back when you picture the doorway?",
        "labels": []
      },
      "half-circle": {
        "name": "Distinction",
        "prompt": "Give the current memory one association. Use that association as a cue to travel to a different entry in your palace.",
        "example": "At the doorway, give the pencil the association “drawing”. When a sheet of paper appears on another breath, encode it at your window. Imagine a stroke running from the pencil to that sheet. Now “drawing” can take you from the doorway to the window.",
        "check": "Can you recall the pencil’s association, then follow it to the paper’s own location?",
        "labels": [
          {
            "label": "Drawing",
            "cue": "Touch the pencil’s “drawing” cue and follow its stroke to the paper at the window."
          }
        ]
      },
      "triangle": {
        "name": "System",
        "prompt": "Give one entry three associations that work together. Use them to build a loop in which the result of one connection guides what happens next.",
        "example": "At the pencil, build the cues “draw”, “measure” and “adjust” over successive visits. When a ruler has its own place, forge the loop. Let the pencil draw a line on the paper, let the line call up the ruler, and let the ruler send the pencil back to lengthen a short line.",
        "check": "Picture the line measuring long enough. What does the ruler now tell the pencil to do?",
        "labels": [
          {
            "label": "Draw",
            "cue": "Let the pencil call up the line on the paper."
          },
          {
            "label": "Measure",
            "cue": "Let the line call up the ruler to check its length."
          },
          {
            "label": "Adjust",
            "cue": "Use the ruler reading to tell the pencil whether to lengthen the line."
          }
        ]
      },
      "square": {
        "name": "Network",
        "prompt": "Give one memory four cues that form two routes to the same destination. Build each link at its own pace.",
        "example": "At the pencil, keep four cues for a drawn line, its length, a row of dots and their spacing. From the pencil, imagine drawing on the paper, then use the line’s length to call up the ruler. A second route goes through a pegboard stored at its own place. The pencil dots its holes and the gaps call up the ruler.",
        "check": "Start at the pencil and reach the ruler through the pegboard. Can you return through the paper?",
        "labels": [
          {
            "label": "Draw line",
            "cue": "Follow the pencil stroke to the paper."
          },
          {
            "label": "Measure line",
            "cue": "Trace the drawn line to the ruler and recall its length."
          },
          {
            "label": "Mark dots",
            "cue": "Follow the pencil’s dot to a hole in the pegboard."
          },
          {
            "label": "Measure gaps",
            "cue": "Use the gap between holes to call up the ruler."
          }
        ]
      },
      "pentagon": {
        "name": "Perspective",
        "prompt": "Give a memory five cues for a task. Use the cues to connect palace entries, then recover the same connection from a different starting point.",
        "example": "At the pencil, build the cues sketch, size, cut, fit and revise. Use them to travel from pencil to plan, plan to ruler, ruler to saw, saw to shelf and shelf back to pencil. From the plan, the ruler tells you how long to cut. From the fitted shelf, that measurement explains why it fits.",
        "check": "Recall the cut from the plan’s location, then from the shelf’s. What question does it answer at each?",
        "labels": [
          {
            "label": "Sketch",
            "cue": "Use the pencil to recall the shelf plan."
          },
          {
            "label": "Size",
            "cue": "Use the plan to retrieve the ruler setting."
          },
          {
            "label": "Cut",
            "cue": "Use the ruler setting to guide the saw."
          },
          {
            "label": "Fit",
            "cue": "Follow the saw cut to the shelf that must fit."
          },
          {
            "label": "Revise",
            "cue": "Let the shelf’s fit cue the pencil to revise the plan."
          }
        ]
      },
      "hexagon": {
        "name": "Mediation",
        "prompt": "Give the current memory six cues and use one of them to carry an instruction between two other entries.",
        "example": "Give the pencil six cues for sketching, sizing, transferring, cutting, fitting and revising. Follow them from pencil to plan, ruler, template, saw and shelf, then back to pencil. At the template’s place, imagine the ruler setting its width. At the saw’s place, let the template guide the cut.",
        "check": "Change the width of the template in memory. Which cut changes, and which measurement on the plan stays the same?",
        "labels": [
          {
            "label": "Sketch",
            "cue": "Use the pencil to retrieve the plan."
          },
          {
            "label": "Size",
            "cue": "Retrieve the required width from the plan."
          },
          {
            "label": "Transfer",
            "cue": "Carry that width from the ruler to the template."
          },
          {
            "label": "Cut",
            "cue": "Use the template to guide the saw cut."
          },
          {
            "label": "Fit",
            "cue": "Recall the shelf the saw must cut to fit."
          },
          {
            "label": "Revise",
            "cue": "Use the shelf’s fit to guide the next pencil mark."
          }
        ]
      },
      "heptagon": {
        "name": "Context",
        "prompt": "Give a memory seven connected cues, including a condition that changes how one of the links should be read.",
        "example": "At the pencil, attach sketch, setting, span, transfer, cut, fit and revise. Use the setting cue to visit the alcove where the shelf belongs. Carry its span to the plan and ruler, then through the template and saw to the shelf. A shelf cut to the same length fits snugly in one alcove and leaves a gap in a wider one.",
        "check": "Keep the cut fixed and imagine a wider alcove. Which part of the fitting instruction must you revise?",
        "labels": [
          {
            "label": "Sketch",
            "cue": "Give the pencil a sketch of the shelf."
          },
          {
            "label": "Setting",
            "cue": "Use the sketch to recall the alcove where the shelf will fit."
          },
          {
            "label": "Span",
            "cue": "Use the alcove width to recall the ruler setting."
          },
          {
            "label": "Transfer",
            "cue": "Transfer that width from ruler to template."
          },
          {
            "label": "Cut",
            "cue": "Use the template to recall the saw cut."
          },
          {
            "label": "Fit",
            "cue": "Check the cut shelf against the alcove."
          },
          {
            "label": "Revise",
            "cue": "Let a gap cue the pencil to revise the sketch."
          }
        ]
      },
      "octagon": {
        "name": "Parallelism",
        "prompt": "Give one entry two sequences of four cues. Send both through the palace from the same starting point and compare their results.",
        "example": "At the pencil, build a route through sketch, ruler and saw to the fitted shelf. Build a second through tracing, template and file to the same shelf. Give each step a job. The first route transfers a measured width. The second copies the outline of the wall.",
        "check": "Imagine a curved wall. Which route carries the curve through to the shelf edge?",
        "labels": [
          {
            "label": "Sketch",
            "cue": "Follow the pencil to the dimensioned sketch."
          },
          {
            "label": "Read size",
            "cue": "Carry the width on the sketch to the ruler."
          },
          {
            "label": "Set saw",
            "cue": "Use the ruler setting to position the saw."
          },
          {
            "label": "Fit cut",
            "cue": "Recall the shelf cut to that width."
          },
          {
            "label": "Trace",
            "cue": "Follow the pencil to a tracing of the wall."
          },
          {
            "label": "Copy contour",
            "cue": "Use the tracing to recall the template contour."
          },
          {
            "label": "Guide file",
            "cue": "Use the template to guide the file."
          },
          {
            "label": "Fit edge",
            "cue": "Recall the shelf edge filed to that contour."
          }
        ]
      },
      "prism": {
        "name": "Correspondence",
        "prompt": "Organise the cues attached to one memory into two working triangles. Join their corresponding roles with three bridges in the palace.",
        "example": "At the pencil, recall the loop “draw, measure, adjust” through paper and ruler. Build its outdoor counterpart around chalk, pavement and measuring tape. Link pencil with chalk as markers, paper with pavement as surfaces, and ruler with tape as measures. Develop one of these links on a visit.",
        "check": "Cross from ruler to tape. Which memory now receives the instruction to correct the line?",
        "labels": [
          {
            "label": "Draw line",
            "cue": "Recall the line the pencil draws on the paper."
          },
          {
            "label": "Measure line",
            "cue": "Use the line on paper to call up the ruler."
          },
          {
            "label": "Adjust pencil",
            "cue": "Let the ruler guide the next pencil mark."
          },
          {
            "label": "Draw stripe",
            "cue": "Recall the stripe the chalk draws on the pavement."
          },
          {
            "label": "Measure stripe",
            "cue": "Use the stripe to call up the measuring tape."
          },
          {
            "label": "Adjust chalk",
            "cue": "Let the tape guide the next chalk mark."
          },
          {
            "label": "Markers",
            "cue": "Cross between pencil and chalk through their shared job of marking."
          },
          {
            "label": "Surfaces",
            "cue": "Cross between paper and pavement through their shared job of receiving the line."
          },
          {
            "label": "Measures",
            "cue": "Cross between ruler and tape through their shared job of checking length."
          }
        ]
      },
      "cube": {
        "name": "Alignment",
        "prompt": "Keep two four-link networks in mind through one entry. Pair their four positions, then check that the same routes work in both.",
        "example": "At the pencil, recall two ways to reach the ruler, through paper or through the pegboard. For the chalk, build the matching routes to the tape through a slate or a tile grid. Match pencil to chalk, paper to slate, pegboard to tiles and ruler to tape. Carry one cue across and try its route.",
        "check": "If the pegboard route uses the spacing between dots, what should the corresponding route measure on the tiles?",
        "labels": [
          {
            "label": "Draw line",
            "cue": "Take the pencil route through the paper."
          },
          {
            "label": "Measure line",
            "cue": "Follow the drawn line from paper to ruler."
          },
          {
            "label": "Mark dots",
            "cue": "Take the pencil route through the pegboard."
          },
          {
            "label": "Measure gaps",
            "cue": "Follow the gaps between holes to the ruler."
          },
          {
            "label": "Draw stripe",
            "cue": "Take the chalk route through the slate."
          },
          {
            "label": "Measure stripe",
            "cue": "Follow the chalk stripe from slate to tape."
          },
          {
            "label": "Mark tiles",
            "cue": "Take the chalk route through the tile grid."
          },
          {
            "label": "Measure spacing",
            "cue": "Follow the spacing of the tiles to the tape."
          },
          {
            "label": "Markers",
            "cue": "Cross between pencil and chalk."
          },
          {
            "label": "Drawing surfaces",
            "cue": "Match the paper route to the slate route."
          },
          {
            "label": "Grids",
            "cue": "Match the pegboard route to the tile route."
          },
          {
            "label": "Measures",
            "cue": "Cross between ruler and tape and check what was measured."
          }
        ]
      },
      "dodecahedron": {
        "name": "Architecture",
        "prompt": "Organise one memory’s cues into groups of five. In the palace, give two neighbouring groups a shared link whose meaning matters to both.",
        "example": "At the pencil, build one group of cues for a shelf plan and another for a curtain plan. Trace one loop through pencil, plan, ruler, saw and shelf. Trace the other through window, plan, ruler, cloth and curtain. Use plan → ruler in both loops to recall the same window width.",
        "check": "Revise the width on the plan. Starting from the ruler, recover the new shelf cut and the new cloth cut.",
        "labels": [
          {
            "label": "Shelf plan",
            "cue": "Recall the pencil, plan, ruler, saw and shelf loop."
          },
          {
            "label": "Shared width",
            "cue": "At the shared plan–ruler link, retrieve the same width from either group."
          },
          {
            "label": "Curtain plan",
            "cue": "Recall the window, plan, ruler, cloth and curtain loop."
          }
        ]
      },
      "icosahedron": {
        "name": "Duality",
        "prompt": "Let a cue on the current entry stand for an entire group of connections. Use a link shared by two groups to move between them.",
        "example": "At the pencil, let “shelf”, “curtain” and “caption” cue whole groups. Shelf and curtain plans share plan → ruler. The shelf and caption groups share pencil → plan. The caption and curtain groups share window → plan. These three meeting points let you travel in a triangle from one group to the next.",
        "check": "Begin in the caption group and reach the shelf group through the curtain group. Which shared link permits each crossing?",
        "labels": [
          {
            "label": "Plan and ruler",
            "cue": "Use this shared link to cross between the shelf and curtain groups."
          },
          {
            "label": "Pencil and plan",
            "cue": "Use this shared link to cross between the caption and shelf groups."
          },
          {
            "label": "Window and plan",
            "cue": "Use this shared link to cross between the curtain and caption groups."
          }
        ]
      },
      "geodesic": {
        "name": "Resolution",
        "prompt": "Refine one association at a time. Give a link between palace entries an intermediate cue that preserves a detail you would otherwise lose.",
        "example": "At the pencil, refine “size” into “read the scale, then measure”. At the plan’s location, use its scale marking to reach the ruler. A two-centimetre line on a plan drawn at one tenth scale now calls up a twenty-centimetre cut. Use this finer route in the shelf and curtain plans.",
        "check": "Keep the drawn line at two centimetres. If each centimetre now represents twenty, what full-size length should the ruler show?",
        "labels": [
          {
            "label": "Read scale",
            "cue": "At the plan, retrieve the scale that converts drawing length to full size."
          },
          {
            "label": "Measure line",
            "cue": "Use the ruler to recover the length drawn on the plan."
          },
          {
            "label": "Recover full size",
            "cue": "Apply the scale to recover the actual shelf length."
          }
        ]
      },
      "sphere": {
        "name": "Wholeness",
        "prompt": "Use the cues on one entry to enter the whole map, then enter elsewhere and see whether you can recover the same dependency.",
        "example": "Begin at the pencil. Use “size” to recall the plan’s scale, then the ruler and the shelf cut. Begin again at the shelf and trace its length back through the ruler to the same scale on the plan. Both journeys should recover the same cut and its reason.",
        "check": "Change the scale marking. Follow both routes again. Do you arrive at the same revised length?",
        "labels": [
          {
            "label": "From pencil",
            "cue": "Travel from the pencil through the plan and ruler to the cut shelf."
          },
          {
            "label": "From shelf",
            "cue": "Trace the cut shelf back through the ruler to the plan."
          },
          {
            "label": "Check agreement",
            "cue": "Recover the same scale and length from both starting points."
          }
        ]
      }
    }
  }
];

  const FEELING_AND_STORY = {
  "circle": {
    "freq": {
      "why": "Let the circle hold one feeling. Pick a word for it if you can.",
      "example": "Imagine a dog greeting someone at the door. What feeling might come with that scene for you?",
      "check": "What do you notice as you picture the greeting?"
    },
    "unitive": {
      "why": "Picture two things that go together. Notice how you feel as you watch.",
      "example": "Picture a blanket keeping a kitten warm. You might feel cosy too.",
      "check": "What is the blanket doing for the kitten?"
    }
  },
  "half-circle": {
    "freq": {
      "why": "Use the line across the shape to tell two feelings apart. You can have both at once.",
      "example": "Before a party you might be glad to go and shy about walking in.",
      "check": "Which part of going to the party feels good? Which part feels different?"
    },
    "unitive": {
      "why": "Keep the same two things in mind. Look for two ways they go together.",
      "example": "Picture your hand around a mug. The mug warms your hand. Your hand keeps the mug steady.",
      "check": "What does the mug do for your hand? What does your hand do for the mug?"
    }
  },
  "triangle": {
    "freq": {
      "why": "Let each corner remind you of a part of the same moment. See which feelings go together.",
      "example": "Imagine a friend gives you a drawing. You may feel pleased that they thought of you.",
      "check": "What makes this drawing special to you?"
    },
    "unitive": {
      "why": "Pick three things in your picture. See how each one goes with the other two.",
      "example": "Imagine tossing a ball for a dog. The dog catches it and brings it back. How might you feel as you watch?",
      "check": "Who brings the ball back to you?"
    }
  },
  "square": {
    "freq": {
      "why": "Picture something happening at one side of the square. Follow the feeling over to someone else.",
      "example": "Imagine joining a game and a friend making room. How might the invitation change the way you feel?",
      "check": "What did your friend do that changed the way you felt?"
    },
    "unitive": {
      "why": "Follow the four sides like a story that comes back to where it began.",
      "example": "Imagine tossing a ball to a dog. The dog takes it to your friend, who hands it back to you.",
      "check": "If the dog keeps the ball, who is waiting for it?"
    }
  },
  "pentagon": {
    "freq": {
      "why": "Pick a place to look from. See whether the same thing feels different from there.",
      "example": "You watch a tall slide from the grass. Now picture sitting at the top. The slide is the same. How do you feel?",
      "check": "What changed when you imagined being at the top?"
    },
    "unitive": {
      "why": "Choose who gets to look. Picture what they see and how it might feel to be there.",
      "example": "A child waits at the top of the slide. You see the long queue. From the child's place, you see how far down the ground looks.",
      "check": "What might you say to the child now?"
    }
  },
  "hexagon": {
    "freq": {
      "why": "Leave room to notice what happens that comes between one feeling and the next.",
      "example": "Imagine wondering whether a friend has forgotten you, then seeing them wave from across the playground.",
      "check": "What helped you go from feeling left out to feeling seen?"
    },
    "unitive": {
      "why": "Follow what carries something from one part of your picture to another.",
      "example": "Your friend is cold. You pass a coat to your sister. She gives it to your friend. Picture where the warm coat goes.",
      "check": "Who helped your kindness reach your friend?"
    }
  },
  "heptagon": {
    "freq": {
      "why": "Keep one feeling in mind. Look at what happened around it.",
      "example": "A loud cheer surprises you. Then you see your friend finish a race and hear everyone clap for them.",
      "check": "Does the cheer feel different once you know why it happened?"
    },
    "unitive": {
      "why": "Pick one bit of your picture. Find the story around it.",
      "example": "You see a friend crying. Then you remember seeing their tower wobble and fall. You sit beside them.",
      "check": "What happened before you arrived that helps you understand your friend?"
    }
  },
  "octagon": {
    "freq": {
      "why": "Follow two feelings side by side. Notice when one changes and the other stays.",
      "example": "Imagine feeling pleased to see a friend at a pool but unsure about the water. Your friend waves. One feeling may change while the other stays.",
      "check": "Which feeling changed when your friend waved?"
    },
    "unitive": {
      "why": "Follow two stories side by side. Watch for the place where they meet.",
      "example": "You get a cup and fill it with water. Your sister finds the puppy and sets down its bowl. You meet at the bowl and pour.",
      "check": "How did both of you help the puppy get a drink?"
    }
  },
  "prism": {
    "freq": {
      "why": "Look at one end, then the other. Can you find a feeling from one story in a different story?",
      "example": "Imagine being new at school. Later you meet another new student and wonder how they feel.",
      "check": "What could you ask to find out how the new child really feels?"
    },
    "unitive": {
      "why": "Picture a story at each end. Match the parts that do the same job.",
      "example": "A child sleeps in a bed under a blanket. A dog sleeps in a basket under a towel. Match the sleepers, the beds and the covers.",
      "check": "What in the puppy's story does the blanket's job?"
    }
  },
  "cube": {
    "freq": {
      "why": "Imagine two whole scenes. Watch where your feelings match and where they change.",
      "example": "Playing catch with a friend can be fun. Playing catch with a dog can be fun too. You might feel cross when the dog runs off with the ball.",
      "check": "Which part feels different when the dog keeps the ball?"
    },
    "unitive": {
      "why": "Compare two stories. Check whether the things you matched actually work the same way.",
      "example": "Imagine tossing a ball to a friend, who throws it back. Then imagine tossing it to a dog, which runs away with it.",
      "check": "Which part of the second story broke the match?"
    }
  },
  "dodecahedron": {
    "freq": {
      "why": "Look at two shapes that share a side. Think of one thing that matters in two parts of your day.",
      "example": "You take your bear to school and hug it at bedtime. The same bear might help you feel at home in both places.",
      "check": "Does the bear feel special in the same way in both places?"
    },
    "unitive": {
      "why": "Find a side that two faces share. Imagine one thing helping two parts of a story.",
      "example": "Picture a park bench. You sit there to tie a shoe. Later, two friends sit there to share a snack. Imagine rain soaking the bench.",
      "check": "What changes for you and for the two friends?"
    }
  },
  "icosahedron": {
    "freq": {
      "why": "Try looking at a whole group as one part of a bigger picture. Does your feeling change?",
      "example": "At a party you see a big crowd. Now you spot a small group making paper hats. You might feel curious about joining them.",
      "check": "What do you notice when you look at the small group?"
    },
    "unitive": {
      "why": "Imagine each group as one point. Join two points if the groups share something.",
      "example": "Imagine each table at a school fair as a dot. Two tables share a box of crayons. Draw a line between their dots in your mind.",
      "check": "If one table gives the crayons away, which other table might need help?"
    }
  },
  "geodesic": {
    "freq": {
      "why": "Look closer at a feeling, as if one big triangle had become four smaller ones.",
      "example": "At first you feel funny about the school play. Look closer. You love the costume and worry about forgetting one line.",
      "check": "Which small part would you like help with?"
    },
    "unitive": {
      "why": "Choose one part of the big picture. Look for a step hiding inside it.",
      "example": "You help a friend cut out a star. Looking more closely, you see that holding the paper steady is one way you help.",
      "check": "What small step made it easier for your friend?"
    }
  },
  "sphere": {
    "freq": {
      "why": "Pick one way into the whole moment. Then try another. See which feelings come back.",
      "example": "Remember a celebration. Begin with a sound, then try starting with a smell. See whether each brings back the same event.",
      "check": "What do you remember both times?"
    },
    "unitive": {
      "why": "Hold the whole story in mind. Start in a different place and find your way through it again.",
      "example": "Picture building a den with a friend. Start with the blanket roof. Then start with your friend's laugh. In both pictures, find the chair that held the roof up.",
      "check": "Can you find the same part by starting somewhere else?"
    }
  }
};

  const PRACTICE_LESSONS = {
  "stream": [
    {
      "title": "See what pops up",
      "body": "A picture, a word or a sound might pop into your mind. Notice what comes next.",
      "try": "Imagine a door. What pops into your mind when it opens?",
      "example": "I picture a red door. I hear a splash. Then I think of a frog."
    },
    {
      "title": "Travel in your picture",
      "body": "If you want a starting point, imagine travelling through a wormhole for about ten seconds. Notice where your imagination takes you.",
      "try": "Look around from inside your picture. Where could you go?",
      "example": "I fly through a starry tunnel in a spaceship. When I come out, there is a moon with a lake."
    },
    {
      "title": "Follow or choose",
      "body": "Sometimes the picture changes on its own. Sometimes you choose what to do next. Either way works.",
      "try": "Stay with what comes up, or try a change. It's fine if nothing new comes yet.",
      "example": "A boat pops into my lake. I choose to climb in. Then a turtle pops its head up."
    },
    {
      "title": "Spot a connection",
      "body": "When you use a shape, look for how two things in your picture go together.",
      "try": "Pick two things you noticed. What does one do for the other?",
      "example": "The turtle rests on a log. The log holds the turtle out of the water."
    }
  ],
  "body": [
    {
      "title": "Find a feeling",
      "body": "Think about what your body feels right now. Something small is enough.",
      "try": "Can you feel where your feet touch the floor, or where your clothes touch your skin?",
      "example": "I can feel my sock against my ankle."
    },
    {
      "title": "Look again",
      "body": "Each word on the shape gives you a way to explore the same feeling.",
      "try": "Choose one word. Where is the feeling? What is it like?",
      "example": "I pick my sleeve. I can feel it on my wrist. One part feels soft and another part tickles."
    },
    {
      "title": "Notice, then guess",
      "body": "Sometimes you can feel something clearly and still wonder what it means. You can say you're unsure.",
      "try": "Finish two thoughts: “I feel …” and “Maybe …”",
      "example": "I feel my cheeks getting warm. Maybe it's because I just ran. I'm still guessing."
    }
  ],
  "frequency": [
    {
      "title": "Notice the mood",
      "body": "As you imagine a scene, notice how you feel. The feeling can change while the story goes on.",
      "try": "Picture a small empty playground. How does it feel to be there?",
      "example": "At first it feels quiet. Then I imagine my friend on the swing and feel glad."
    },
    {
      "title": "Notice how it moves",
      "body": "Sometimes pictures come quickly. Sometimes one picture stays for a while.",
      "try": "Does your picture stay still, change bit by bit, or jump to something new?",
      "example": "I picture a cloud rolling slowly across the sky. Suddenly it looks like a dog."
    },
    {
      "title": "Make room for a feeling",
      "body": "You can gently try out a feeling, like kindness or curiosity. See what happens.",
      "try": "Think of a friend or a favourite toy. What happens to the mood of your picture?",
      "example": "I imagine someone I trust beside me and notice how the scene feels."
    },
    {
      "title": "Hold two feelings together",
      "body": "A picture can come with more than one feeling. The shape helps you remember the feelings you find.",
      "try": "Pick one feeling and see if another is there too.",
      "example": "At the top of a big slide, I feel excited and a bit scared. Both belong in the same picture."
    }
  ],
  "heart": [
    {
        "title": "Breathe through the heart",
        "body": "Rest attention in the centre of the heart. Soften the chest and let the breath flow gently in and out through that area.",
        "try": "If the guide feels comfortable, breathe in for five seconds and out for five seconds.",
        "example": "I return my attention to the heart area as the breath moves in and out."
    },
    {
        "title": "Let love come forward",
        "body": "Invite a sincere feeling of love as a felt experience in the heart. Let it arise on its own, beginning with whatever is honestly present.",
        "try": "Keep your attention with the feeling and breathe it through the heart.",
        "example": "A subtle warmth or sense of openness may arise. The feeling can be quiet or difficult to sense."
    },
    {
        "title": "Sustain and deepen",
        "body": "Stay with the feeling of love, sustaining it through the breath and allowing it to deepen. Let your attention follow the signal through the body.",
        "try": "Apply enough attention to stay with the feeling while allowing it to develop naturally.",
        "example": "I sustain the feeling with each breath and notice whether its quality or intensity shifts."
    }
],
  "transmutation": [
    {
      "title": "Enter a quality",
      "body": "Return to the heart as you did in Heart Activation. Bring the highlighted quality forward as you inhale and sustain its feeling as you exhale.",
      "try": "Can you recognise the quality by how it feels?",
      "example": "Let devotion come forward. Across the next breath, see if you can recognise confidence by how it changes your readiness to act."
    },
    {
      "title": "Blend the qualities",
      "body": "Use the highlighted regions together for one full breath. On the next inhale, follow the new combination.",
      "try": "Which quality changes the way the others feel?",
      "example": "Let resolve give your choice direction and patience give you room to wait."
    }
  ],
  "unitive": []
};

  function mount({root: host, stageId, onStageChange, initialExercise, onExerciseChange}) {
    const D = root.FormShapePractice, E = root.FormExercises, G = root.FormGeometry;
    let storage; try { storage = root.localStorage; } catch (_) { storage = null; }
    const store = root.FormTrainingStore.createStore(storage);
    const resolveStage = id => id === 'open-streaming' ? {...D.getStage('circle'), id:'open-streaming', name:'Open Streaming'} : D.getStage(id);
    const routeExercise = mode => ({
      __proto__: null,
      wave: 'stream', stream: 'stream', frequency: 'frequency', transmutation: 'frequency',
      heart: 'heart', oscillatory: 'unitive', 'oscillatory-connections': 'unitive',
      'oscillatory-combined': 'unitive', open: 'open'
    })[mode] || 'body';
    let stage = resolveStage(stageId), exercise = routeExercise(initialExercise), clock = null, audio = new E.ExerciseAudio({onError:sessionSoundFailure});
    let sessionAudioFailed = false;
    let unsaved = false, fieldsGeneration = 0, modelState = 0, selectedRelationship = '', walkthroughStep = 0, walkthroughGeneration = 0;
    const testAudio = new E.ExerciseAudio({onError:soundFailure});
    let recorded = false, peek = null, lastBodyStep = -1, lastCue = '', lastPrompt = '', announcement = '';
    let sound = true, bell = true, frequency = 10, bellVolume = 1, pacing = ['stream','frequency','heart','unitive','body'].includes(exercise) ? 'paced' : 'natural', duration = 15;
    let inhaleSeconds=5, exhaleSeconds=5;
    const rhythmStorageKey='form-breath-timing-v1';
    try { const saved=JSON.parse(storage?.getItem(rhythmStorageKey)||'null'); if(saved&&E.validBreathTiming(saved.inhaleSeconds,saved.exhaleSeconds)){inhaleSeconds=saved.inhaleSeconds;exhaleSeconds=saved.exhaleSeconds;} } catch (_) {}
    const pacingByExercise = {stream:'paced', frequency:'paced', heart:'paced', body:'paced', unitive:'paced', open:'natural'};
    const exerciseNames = {stream:'Wave Psiduction', frequency:'Frequency Psiduction', heart:'Heart Activation', body:'Signal Psiduction', unitive:'Oscillatory Psiduction', open:'Synchronised Psiduction'};

    const exerciseOrder = ['body','frequency','stream','unitive','open'];
    const volumes = {0:1,1:.48,2:.48,3:.48,8:1,10:1,12:1}, drafts = new Map();
    const q = selector => host.querySelector(selector);
    const all = selector => [...host.querySelectorAll(selector)];
    const guideId = () => exercise==='unitive'||exercise==='frequency'||exercise==='open'?'stream':exercise;
    const frequencyActive = () => ['frequency','heart'].includes(exercise);
    const isTransmutation = () => exercise === 'frequency' && frequencyModule === 'transmutation';
    let agencyMap = null;
    let agencyOrder = [];
    let agencyStartId = null;
    let agencyBreathBase = 0;
    let agencyLastFrame = null;

    function updateAgencyPractice(snapshot) {
      if (!agencyMap) return;
      const status = snapshot.status;
      const active = status === 'running' || status === 'paused';
      if (active || status === 'idle' || !agencyLastFrame) {
        agencyLastFrame = window.AgencyPractice.frame({
          stageId:stage.id,
          breath:active ? agencyBreathBase + snapshot.breathCycleIndex : 0,
          phase:active ? snapshot.breathPhase : 'inhale',
          progress:active ? snapshot.breathProgress : 0,
          order:agencyOrder,
          start:agencyStartId
        });
      }
      agencyMap.update(agencyLastFrame, {status,phase:snapshot.breathPhase,shapeName:stage.name});
    }

    function mountAgencyPractice() {
      const element = q('[data-transmutation-map]');
      if (!element) return;
      agencyMap = window.TransmutationMap.mount(element, {
        stageId:stage.id, order:agencyOrder, startId:agencyStartId,
        onStartAt(cellId) {
          if (runningSession()) return;
          agencyStartId=cellId;
          agencyLastFrame=null;
          tick();
        },
        onOrderChange(order) {
          if (runningSession()) return;
          agencyOrder=order.slice();
          agencyStartId=order[0] || null;
          agencyLastFrame=null;
          tick();
        }
      });
      element.querySelector('[data-agency-pacer]').appendChild(q('.training-page-symbol'));
    }
    let frequencyModule=['transmutation','heart'].includes(initialExercise) ? initialExercise : 'integrated', signalSelection=new Set(), signalFocus=0, shapeFocus=0, signalCycleBase=0;
    const lociProgressKey = 'form-oscillatory-steps-v1';
    function readLociProgress() {
      try {
        const saved = Number(storage?.getItem(lociProgressKey));
        return Number.isInteger(saved) && saved >= 0 && saved < LOCI_COURSE.length ? saved : 0;
      } catch (_) { return 0; }
    }
    let unlockedLoci = readLociProgress();
    let previewLociCue = false;
    function permittedLociStep(mode) {
      const requested = LOCI_COURSE.findIndex(step => step.route === mode);
      return Math.min(unlockedLoci, Math.max(0, requested));
    }
    let lociStep = permittedLociStep(initialExercise);
    let lociExampleIndex = Math.max(0, D.STAGES.findIndex(item => item.id === stage.id));
    function currentLociLesson(id = stage.id) {
      return LOCI_COURSE[lociStep].lessons[id] || LOCI_COURSE[lociStep].lessons.circle;
    }
    function lociScale(shape) {
      if (shape.id === 'circle') return 'Placement';
      const count = shape.id === 'half-circle' ? 1 : shape.relationCount;
      return count + (count === 1 ? ' connection' : ' connections');
    }
    function routeMode() {
      if (exercise === 'unitive') return LOCI_COURSE[lociStep].route;
      if (exercise === 'frequency') return frequencyModule === 'transmutation' ? 'transmutation' : 'frequency';
      return {stream:'wave', open:'open', heart:'heart'}[exercise] || '';
    }
    function showRoute(mode) {
      const target = routeExercise(mode);
      const module = mode === 'transmutation' || mode === 'heart' ? mode : 'integrated';
      const nextLoci = permittedLociStep(mode);
      if (target === 'unitive' && LOCI_COURSE[nextLoci].route !== mode) {
        onExerciseChange(LOCI_COURSE[nextLoci].route);
      }
      if (exercise === target && (!frequencyActive() || frequencyModule === module)
          && (target !== 'unitive' || lociStep === nextLoci)) return;
      end();
      clock = null;
      exercise = target;
      if (target === 'unitive') lociStep = nextLoci;
      if (frequencyActive()) frequencyModule = module;
      shapeFocus = 0;
      pacing = pacingByExercise[exercise];
      duration = 15;
      peek = null;
      lastPrompt = '';
      announcement = '';
      render();
    }
    // Signal levels count the fourteen training stages, not the shape's edge count.
    const signalAnchorIndex=()=>stage.id==='open-streaming'?-1:D.STAGES.findIndex(item=>item.id===stage.id);
    const signalAnchor=()=>{const i=signalAnchorIndex();return i<0?null:E.BODY_STEPS[i];};
    const signalLimit=()=>signalAnchorIndex()<0?E.BODY_STEPS.length:signalAnchorIndex()+1;
    function resetSignalSelection(){signalSelection=new Set(Array.from({length:signalAnchorIndex()<0?1:signalLimit()},(_,i)=>i));signalFocus=0;signalCycleBase=0;shapeFocus=0;}
    function modePairings(){
      if(stage.id==='open-streaming')return [];
      if(exercise==='body')return E.BODY_STEPS.slice(0,signalLimit()).map((d,i)=>({label:d.label,pair:D.STAGES[i].name+' · '+d.label}));
      if(exercise==='heart'){const heart=HEART_SHAPES[stage.id]||HEART_SHAPES.circle;return [{label:heart.label,pair:heart.name,group:false}];}
      if (isTransmutation()) return [];
      if(exercise==='frequency'){
        const total=stage.relationCount<=8?stage.relationCount:4;
        return Array.from({length:total},(_,i)=>({label:'Quality '+(i+1),pair:'Felt quality '+(i+1),group:false}));
      }
      const total=stage.relationCount;
      if(exercise==='stream'){
        const groupSize=total>12?10:1;
        return Array.from({length:Math.ceil(total/groupSize)},(_,i)=>{
          const first=i*groupSize+1,last=Math.min(first+groupSize-1,total);
          const label=first===last?String(first):first+'–'+last;
          return {label,pair:(first===last?'Relationship ':'Relationships ')+label,group:groupSize>1};
        });
      }
      if (exercise === 'unitive') {
        const lesson = currentLociLesson();
        if (!lesson.labels.length) return [{label:'Location', pair:'Placement', cue:lesson.example}];
        return lesson.labels.map(({label, cue}) => ({label, cue, pair:label}));
      }
      if(total<=12)return Array.from({length:total},(_,i)=>({label:'Relationship '+(i+1),pair:'Relationship '+(i+1),group:false}));
      return Array.from({length:Math.ceil(total/10)},(_,i)=>({label:'Relationships '+(10*i+1)+'–'+Math.min(total,10*i+10),pair:'Relationships '+(10*i+1)+'–'+Math.min(total,10*i+10),group:true}));
    }
    function signalShapeLabels(){
      const items=modePairings();if(!items.length)return '';
      const count=items.length, svg=G.miniIcon(stage.id,65), lines=[...svg.matchAll(/<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/g)].map(m=>m.slice(1).map(Number));
      const point=i=>{
        if(stage.id==='circle')return [50,5];
        if(stage.id==='half-circle')return i===0?[50,2]:[50,91];
        if((exercise==='stream'||exercise==='unitive')&&stage.relationCount<=12&&lines.length===count){
          const [x1,y1,x2,y2]=lines[i],a=Math.hypot(x1-120,y1-120),b=Math.hypot(x2-120,y2-120);
          const [fx,fy,nx,ny]=a>=b?[x1,y1,x2,y2]:[x2,y2,x1,y1];
          let x=(x1+x2)/2,y=(y1+y2)/2;if(Math.hypot(x-120,y-120)<62){x=fx*.78+nx*.22;y=fy*.78+ny*.22;}
          return [(x-24)/192*100,(y-24)/192*100];
        }
        const a=-Math.PI/2+2*Math.PI*i/count,dx=Math.cos(a),dy=Math.sin(a);let far=0;
        for(const [x1,y1,x2,y2] of lines){const ex=x2-x1,ey=y2-y1,den=dx*ey-dy*ex;if(Math.abs(den)<1e-7)continue;const x=x1-120,y=y1-120,t=(x*ey-y*ex)/den,u=(x*dy-y*dx)/den;if(t>far&&u>=-0.001&&u<=1.001)far=t;}
        const radius=far||86;return [(120+dx*radius-24)/192*100,(120+dy*radius-24)/192*100];
      };
      return '<div class="signal-shape-labels" role="group" aria-label="Explore the shape pairings">'+items.map((d,i)=>{const [x,y]=point(i),name=d.label,focus=exercise==='body'?signalFocus:shapeFocus;return `<button type="button" class="signal-shape-label" data-signal-vector="${i}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" aria-label="${esc(d.pair+(name!==d.label?' · '+name:''))}" title="${esc(d.pair)}" aria-pressed="${i===focus}">${esc(name)}</button>`;}).join('')+'</div>';
    }
    function waveRelationshipText() {
      // Sphere keeps the same map as Geodesic and changes the starting point.
      const entries=WAVE[stage.id==='sphere'?'geodesic':stage.id].relationships;
      const pageSize=entries.length>12?10:1;
      return entries.slice(shapeFocus*pageSize,(shapeFocus+1)*pageSize);
    }
    resetSignalSelection();

    const key = () => stage.id + ':' + exercise;
    function draft() {
      if (!drafts.has(key())) drafts.set(key(), {streamId:uid(),lag:1,source:'',recollection:'',relation:'',revision:'',locked:false,reference:null,revealed:false});
      return drafts.get(key());
    }
    function history() { const d = draft(); return store.data.entries.filter(e => e.streamId === d.streamId && e.stageId === stage.id && e.exercise === exercise); }
    function target() { const d=draft(); if(d.locked)return d.reference; const h=history(); return h.length>=d.lag?h[h.length-d.lag]:null; }
    function staleReference() { const d=draft(); if(!d.locked||!d.reference)return false; const h=history(),exact=h[h.length-d.lag]; return !exact||exact.id!==d.reference.id||exact.source!==d.reference.source; }
    function dirty() { return [...drafts.values()].some(d => ['source','recollection','relation','revision'].some(k => d[k].trim())); }
    function runningSession() { return clock && ['running','paused'].includes(clock.snapshot().status); }
    function message(text) { announcement = text; const el=q('[data-message]'); if(el) el.textContent=text; }
    function save(data) { const result = store.save(data); unsaved = !result.ok; if (!result.ok) message(result.error + ' Your existing record is preserved. Practice can continue without saving.'); renderStorage(); return result; }
    function renderStorage() {
      const el=q('[data-storage]'); if (!el) return;
      el.hidden = !store.warning;
      el.textContent = store.warning || '';
      const recovery=q('[data-original]'); if(recovery) recovery.hidden = !store.warning || !store.originalRaw;
      const reload=q('[data-reload]'); if(reload) reload.hidden = !store.warning;
    }
    function download(text, suffix) {
      const url=URL.createObjectURL(new Blob([text],{type:'application/json'})), link=document.createElement('a');
      link.href=url;link.download='Philosophy-of-Intelligence-'+suffix+'-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
    function finishRecord(snapshot) {
      if (recorded || !clock || snapshot.elapsedSeconds <= 0) return;
      // The record controls are no longer part of practice. Retain existing data
      // at capacity and let the exercise continue without adding another period.
      if(store.data.sessions.length>=root.FormTrainingStore.LIMITS.sessions)return;
      const data=store.data,id=uid();
      data.sessions.push({id,stageId:exercise==='open'?'open-streaming':stage.id,exercise,endedAt:new Date().toISOString(),seconds:snapshot.elapsedSeconds,completed:snapshot.status==='completed'});
      save(data);recorded=store.data.sessions.some(period=>period.id===id);renderRecord();
      if(!recorded)message('This '+time(snapshot.elapsedSeconds)+' practice period could not be added to the saved record. Your earlier records are preserved. You can keep practising.');
    }
    function pause() {
      if (clock && clock.snapshot().status === 'running') clock.pause();
      audio.stop();testAudio.stop();tick();
    }
    function end() {
      audio.stop();testAudio.stop();
      if(!clock)return;
      clock.end();finishRecord(clock.snapshot());tick();renderReadiness();
    }
    function audioEnabled() { return sound || bell; }
    function soundStatus(text) { const el=q('[data-sound-status]');if(el)el.textContent=text; }
    function soundFailure() { q('.training-sound').open=true;soundStatus('Sound could not start. Tap Test bell to try again.'); }
    function sessionSoundFailure() { sessionAudioFailed=true;soundFailure(); }
    function startAudio() {
      sessionAudioFailed=false;
      soundStatus('');
      if(audioEnabled() && !audio.start({frequency:sound?frequency:0,bellVolume:bell?bellVolume:0})) sessionSoundFailure();
    }
    function refreshAudio() {
      audio.stop();
      if(clock?.snapshot().status==='running')startAudio();
    }
    function setPacing(value) {
      if(value===pacing || (isTransmutation() && value!=='paced'))return;
      pacing=value;pacingByExercise[exercise]=value;
      if(pacing==='paced'&&clock)clock.restartBreath();
      q('[data-pacing]').value=pacing;lastPrompt='';refreshAudio();updateRhythmLabels();tick();
    }
    function rhythmLabel() { return inhaleSeconds+' seconds in · '+exhaleSeconds+' seconds out'; }
    function updateRhythmLabels() {
      q('[data-paced-option]').textContent=rhythmLabel();
      q('[data-rhythm-current]').textContent='Guide: '+rhythmLabel()+'.';
      q('[data-bell-help]').textContent=isTransmutation()
        ? 'The bell marks the beginning of each inhale and exhale.'
        : 'Bells mark each inhale and exhale with the guide. Own rhythm keeps only the finish bell.';
    }
    function applyBreathTiming() {
      const inhale=Number(q('[data-inhale]').value.trim()),exhale=Number(q('[data-exhale]').value.trim());
      const valid=E.validBreathTiming(inhale,exhale);
      q('[data-inhale]').setAttribute('aria-invalid',String(!Number.isFinite(inhale)||inhale<0.1));
      q('[data-exhale]').setAttribute('aria-invalid',String(!Number.isFinite(exhale)||exhale<0.1));
      if(!valid){q('[data-rhythm-status]').textContent='Enter a valid duration of at least 0.1 seconds for both inhale and exhale.';return false;}
      const changed=inhale!==inhaleSeconds||exhale!==exhaleSeconds;
      if (clock && changed) {
        if (exercise === 'body') signalCycleBase=signalFocus;
        if (isTransmutation()) agencyBreathBase += clock.snapshot().breathCycleIndex;
        clock.setBreathTiming(inhale,exhale);
      }
      inhaleSeconds=inhale;exhaleSeconds=exhale;
      q('[data-inhale]').value=inhale;q('[data-exhale]').value=exhale;
      let saved=true;try { if(!storage)throw new Error('Unavailable');storage.setItem(rhythmStorageKey,JSON.stringify({inhaleSeconds,exhaleSeconds})); } catch (_) {saved=false;}
      updateRhythmLabels();lastPrompt='';
      const state=clock?.snapshot().status;
      q('[data-rhythm-status]').textContent=(changed&&pacing==='paced'&&state==='running'?'Applied · a new inhale starts now.':changed&&pacing==='paced'&&state==='paused'?'Applied · resume to start a new inhale.':'Guide set to '+inhaleSeconds+' / '+exhaleSeconds+' seconds.')+(saved?'':' This rhythm is available in this tab; browser storage could not save it.');
      if(changed&&pacing==='paced'&&state==='running')refreshAudio();
      tick();return true;
    }
    function soundSummary() { return 'Bell '+(bell?'on':'off')+' · Ambient '+(sound?'on':'off'); }
    function setBell(value) {
      bell=value;
      q('[data-bell]').checked=bell;
      const button=q('[data-bell-toggle]');button.textContent='Bell: '+(bell?'on':'off');
      button.setAttribute('aria-pressed',String(bell));button.setAttribute('aria-label',bell?'Mute bell sound':'Enable bell sound');
      q('[data-sound-summary]').textContent=soundSummary();refreshAudio();
    }
    function start() {
      if (runningSession()) return;
      if(!applyBreathTiming())return;
      recorded=false;peek=null;lastBodyStep=-1;lastCue='';lastPrompt='';message('');
      if(exercise==='body'){signalFocus=0;signalCycleBase=0;}
      agencyBreathBase=0;
      agencyLastFrame=null;
      clock = new E.ExerciseClock({exercise,duration:duration*60,inhaleSeconds,exhaleSeconds,onComplete:snapshot=>{
        finishRecord(snapshot); if(audioEnabled())audio.complete();
        message(exercise==='open'||stage.id==='open-streaming'||frequencyActive()?'Practice complete. Take a moment to rest.':'Practice complete. Take a moment to review your relationships.');
        renderReadiness();
      }});
      q('[data-return]').open=false;
      clock.start(); startAudio(); tick();
    }
    function resume() {
      if (!clock) return;
      q('[data-return]').open=false;
      clock.resume();startAudio();tick();
    }
    function currentModel() { return stage[guideId()].model||root.FormRelationalModels?.getModel(stage.id,guideId()); }
    function modelParts(model,stateIndex=modelState) {
      const state=model.states?.[stateIndex];
      return {state,relations:state?.relations||model.relations||[],nodes:state?.nodes||model.nodes||[]};
    }
    function modelHTML(model,stateIndex=0) {
      const {state,relations,nodes}=modelParts(model,stateIndex),changed=new Set(state?.changedRelationIds||[]);
      return `<p>${esc(state?.label||model.description||'Complete selected relationships for this entry.')}</p><p class="training-fine">${relations.length} relationship${relations.length===1?'':'s'} across ${nodes.length} roles. ${stateIndex===0?'This is the complete starting model.':changed.size?changed.size+' relationship'+(changed.size===1?' changes':'s change')+' from the previous entry; all others are retained.':'Every relationship is retained from the previous entry.'}</p><ol class="training-register">${relations.map(relation=>`<li${changed.has(relation.id)?' class="training-relationship-changed"':''}><span><button type="button" class="training-relation-link" data-trace-relation="${esc(relation.id)}" aria-pressed="${relation.id===selectedRelationship}" aria-label="Trace ${esc(relation.id)}: ${esc(relation.text)}">${esc(relation.id)}</button>${changed.has(relation.id)?'<small>Changed</small>':''}</span><p>${esc(relation.text)}</p></li>`).join('')}</ol>`;
    }
    function explorerHTML(model) {
      return `<div class="training-model-explorer" data-model-explorer><div class="training-explorer-controls"><label class="training-register-picker">Inspect the whole entry<select data-model-state aria-label="Inspect the whole entry">${(model.states||[{breath:1}]).map((state,i)=>`<option value="${i}">Breath ${i+1} · full model</option>`).join('')}</select></label><label class="training-register-picker">Trace a relationship<select data-model-relation aria-label="Trace a relationship"><option value="">Whole structure</option></select></label></div><p class="training-fine" data-model-state-summary></p><figure class="training-network"><div data-model-diagram></div><div class="training-network-key" aria-label="Diagram legend"><span><i aria-hidden="true"></i>Relationship</span><span><i class="is-changed" aria-hidden="true"></i>Changed since the previous entry</span><span><i class="is-traced" aria-hidden="true"></i>Traced relationship</span></div></figure><div class="training-traced-relationship" data-traced-relationship role="status"></div><details class="training-model-roles" data-model-role-key><summary data-model-role-summary>Numbered role key</summary><dl data-model-role-list></dl></details></div>`;
    }
    function updateExplorer() {
      const model=currentModel();if(!model||!q('[data-model-diagram]'))return;
      const {state,relations,nodes}=modelParts(model),nodeNames=new Map(nodes.map(node=>[node.id,node.label])),nodeNumbers=new Map(nodes.map((node,index)=>[node.id,index+1]));
      if(selectedRelationship&&!relations.some(relation=>relation.id===selectedRelationship))selectedRelationship='';
      const picker=q('[data-model-relation]');
      picker.innerHTML='<option value="">Whole structure</option>'+relations.map(relation=>`<option value="${esc(relation.id)}" ${relation.id===selectedRelationship?'selected':''}>${esc(relation.id)} · ${nodeNumbers.get(relation.from)} ${esc(nodeNames.get(relation.from)||relation.from)} / ${nodeNumbers.get(relation.to)} ${esc(nodeNames.get(relation.to)||relation.to)}</option>`).join('');
      picker.value=selectedRelationship;
      q('[data-model-state-summary]').textContent=(state?.label||model.description||'Complete selected model')+' · '+relations.length+' relationship'+(relations.length===1?'':'s')+' / '+nodes.length+' roles';
      q('[data-model-diagram]').innerHTML=root.FormModelView?root.FormModelView.render(model,modelState+1,selectedRelationship||undefined):'<p class="training-fine">The full relationship register below describes this model.</p>';
      const selected=relations.find(relation=>relation.id===selectedRelationship);
      q('[data-traced-relationship]').innerHTML=selected?`<p class="eyebrow">${esc(selected.id)} · SELECTED RELATIONSHIP</p><p>${esc(selected.text)}</p><p class="training-fine">Roles ${nodeNumbers.get(selected.from)} and ${nodeNumbers.get(selected.to)}: ${esc(nodeNames.get(selected.from)||selected.from)} / ${esc(nodeNames.get(selected.to)||selected.to)} · The full model still contains ${relations.length} relationship${relations.length===1?'':'s'}.</p>`:`<p>Whole structure · ${relations.length} relationship${relations.length===1?'':'s'}</p>`;
      q('[data-model-role-summary]').textContent='Numbered role key · '+nodes.length+' roles';
      q('[data-model-role-list]').innerHTML=nodes.map((node,index)=>`<dt>${index+1} · ${esc(node.id)}</dt><dd>${esc(node.label)}</dd>`).join('');
      all('[data-trace-relation]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.traceRelation===selectedRelationship)));
    }
    function bindRegister() {
      all('[data-trace-relation]').forEach(button=>button.addEventListener('click',()=>{selectedRelationship=button.dataset.traceRelation;updateExplorer();q('[data-model-relation]').focus();q('[data-model-explorer]').scrollIntoView({block:'nearest'});}));
    }
    function selectWorkedEntry(index) {
      const model=currentModel();if(!Number.isInteger(index)||!model.states?.[index])return;
      modelState=index;walkthroughStep=0;q('[data-model-state]').value=String(index);
      q('[data-model-content]').innerHTML=modelHTML(model,index);bindRegister();updateExplorer();renderWalkthrough();
    }
    function renderWalkthrough() {
      const guide=stage[guideId()],example=guide.examples[modelState],previous=guide.examples[modelState-1];
      const titles=['Inhale · receive and select','Exhale · encode first',previous?'Then retrieve the earlier entry':'Seed the history',previous?'Compare and annotate':'Preserve the first entry'];
      const prompts=[example.inhale,example.encode,
        previous?'With the current entry secured at your '+example.address+', mentally retrieve the entry at your '+previous.address+'. Recover its roles and meanings before revealing the worked comparison. If recall is uncertain, keep that uncertainty.':'There is no earlier entry in this separate run. Keep the current selection at your '+example.address+'; do not invent a comparison target.',
        previous?example.compare+' Append this comparison separately, preserving both original entries.':'The first entry is now the history for the next return. Leave it intact at your '+example.address+'.'];
      const generation=++walkthroughGeneration,currentKey=key();
      const isCurrent=()=>generation===walkthroughGeneration&&key()===currentKey;
      q('[data-walkthrough]').innerHTML=`<p class="eyebrow">ENTRY ${modelState+1} OF 4</p><p class="training-fine">${esc(stage.name)} · ${esc(exerciseNames[exercise])} · ${esc(example.address)}${previous?' → return to '+esc(previous.address):' · no earlier target'}</p><h3 data-walkthrough-title tabindex="-1">${titles[walkthroughStep]}</h3><p data-walkthrough-prompt>${esc(prompts[walkthroughStep])}</p><div class="training-walkthrough-actions"><button type="button" class="text-button" data-walk-back ${walkthroughStep===0&&modelState===0?'disabled':''}>← ${walkthroughStep===0?'Previous entry':'Previous step'}</button><button type="button" class="button secondary" data-walk-next>${walkthroughStep<3?['Continue to encoding','Current entry encoded →','Show worked comparison'][walkthroughStep].replace('Show worked comparison',previous?'Show worked comparison':'Keep the first entry'):modelState<3?'Next entry →':'Rehearse again'}</button></div>`;
      q('[data-walk-next]').addEventListener('click',()=>{if(!isCurrent())return;if(walkthroughStep<3){walkthroughStep++;renderWalkthrough();}else selectWorkedEntry(modelState<3?modelState+1:0);q('[data-walkthrough-title]').focus();});
      q('[data-walk-back]').addEventListener('click',()=>{if(!isCurrent())return;if(walkthroughStep>0){walkthroughStep--;renderWalkthrough();}else if(modelState>0)selectWorkedEntry(modelState-1);q('[data-walkthrough-title]').focus();});
    }
    function workedExampleHTML(guide) {
      const model=guide.model||root.FormRelationalModels?.getModel(stage.id,exercise);
      const register=guide.register||model?.relations||[];
      return `<details class="training-examples" data-examples><summary>More detail · four practice turns</summary>
        <p class="training-fine">${stage.relationCount>8?'Learn the full register before rehearsing. ':''}Take additional natural breaths as needed. These controls rehearse entries; they do not save notes.</p>
        <div class="training-walkthrough" data-walkthrough></div>
        ${model?explorerHTML(model):''}
        <details class="training-model" data-model-register><summary>All ${register.length} relationships</summary><div data-model-content>${modelHTML(model||{relations:register})}</div></details>
      </details>`;
    }
    // The laboratory is self-paced and separate from the running exercise.
    let labMode='stream',labModule='integrated',labPage=0;
    const labOrder=['signal','frequency','stream','unitive'];
    const labNames={signal:'Signal Psiduction',frequency:'Frequency Psiduction',stream:'Wave Psiduction',unitive:'Oscillatory Psiduction'};
    const labModuleNames={integrated:'Frequency and the stream',heart:'Heart Activation',transmutation:'Transmutation'};
    const labLessonKey=()=>labMode==='signal'?'body':labMode==='frequency'?(labModule==='integrated'?'frequency':labModule):labMode;
    function laboratoryLessons(mode) {
      const cards=PRACTICE_LESSONS[mode];
      if(stage.id==='open-streaming')return mode==='stream'?cards.filter(card=>card.title!=='Spot a connection'):cards;
      const wave=WAVE[stage.id], anchor=signalAnchor();
      let first;
      if(mode==='stream')first={title:stage.name+' · '+wave.name,body:wave.why,try:wave.check,example:wave.example};
      else if(mode==='body')first={title:stage.name+' · '+anchor.label,body:anchor.pairing,try:anchor.prompt,example:anchor.example};
      else if(mode==='frequency'){
        const lesson=FEELING_AND_STORY[stage.id].freq;
        first={title:stage.name+' · Try a feeling',body:lesson.why,try:lesson.check,example:lesson.example};
      }else if(mode==='unitive'){
        const lesson = currentLociLesson();
        return [{title:stage.name+' · '+lesson.name, body:lesson.prompt, try:lesson.check, example:lesson.example}];
      }
      const rest=mode==='body'?cards.concat(E.BODY_STEPS.filter(step=>step!==anchor).map(step=>({
        title:D.STAGES[E.BODY_STEPS.indexOf(step)].name+' · '+step.label,
        body:step.pairing,try:step.prompt,example:step.example
      }))):cards;
      return first?[first,...rest]:rest;
    }
    function laboratoryTheory(mode) {
      const heartTheory=[
        {title:'The heart and its nervous system', paragraphs:[
          'Project Meaning presents the heart as an organ with its own neural activity and chemical signalling. Its purpose is to encourage attention to the felt body, rather than treating the heart as only a symbol.',
          'Research describes an intrinsic cardiac nervous system with sensory, local-circuit and motor neurons that participates in regulating the heart and communicates with the wider nervous system. Project Meaning gives an estimate of about 40,000 sensory neurons; that specific figure and classification are not established by the review linked below. A heart can generate a rhythm without direct brain commands because it contains pacemaker cells; that is not evidence that it stores autobiographical memories.',
          'Project Meaning proposes that experiences of love are held in heart tissue and reactivated there. The cardiac-neuron and oxytocin studies do not establish this claim about personal memory.' ], refs:['armour','jankowski']},
        {title:'Breath, heart-rate variability and resonance', paragraphs:[
          'Heart-rate variability (HRV) describes variation in the time between heartbeats. Heart rate naturally changes with breathing, and the baroreflex links blood-pressure changes with adjustments in heart rate.',
          'The preview offers natural breathing and an adjustable guide; its initial guide is five seconds in and five seconds out, or six breaths per minute. HRV biofeedback research investigates breathing near a person’s resonance frequency. That frequency varies between people, and this preview does not measure it or provide HRV feedback.',
          'A large app dataset reported 0.10 Hz as its most common coherence frequency, but it measured sessions from people using one biofeedback app, not a representative sample of every person. A regular trace is a measurement, not proof of a particular emotion or a guarantee of health.' ], refs:['lehrer','balaji']},
        {title:'What feeling may add', paragraphs:[
          'The project proposes that a sincere feeling of love or appreciation adds an emotional dimension to slow breathing. Its practice asks you to attend to a felt sense of care while maintaining a comfortable breath.',
          'The project proposes a caregiving and reward network involving regions such as the orbitofrontal cortex, anterior cingulate, striatum and ventral tegmental area. It also proposes oxytocin release, increased vagal activity and reduced cortisol as pathways by which love adds to breathing. Studies of romantic and maternal love compared brain activity while people viewed photographs of loved ones and comparison individuals; a separate small study compared HRV patterns during self-induced anger and appreciation. These observations do not establish that this exercise activates a unique circuit, releases a specified amount of oxytocin or suppresses cortisol.',
          'A randomised meditation study also examined telomere length after loving-kindness and mindfulness training. Its result is interesting, but it does not directly test heart-focused breathing or establish the long-term biological effects of this practice.' ], refs:['bartels2000','bartels2004','mccraty','lenguyen']},
        {title:'Sincerity, expression and effort', paragraphs:[
          'Project Meaning distinguishes a feeling that is genuinely present from an attempt to perform or force an emotion. It suggests starting with whatever degree of warmth or care can honestly be felt, then sustaining and gently deepening it.',
          'Research on facial expression has examined differences between types of smiles and associated brain activity. Gross and Levenson studied the short-term effects of suppressing expressions during emotional films. Those studies do not provide a reliable test of whether a person’s feeling is genuine, and suppressing an expression is not the same thing as intentionally cultivating care.',
          'In practice, acknowledge what is present. A subtle or absent feeling is useful information; attention can remain gentle without demanding a specific experience.' ], refs:['ekman','gross']},
        {title:'Ambient sound and brain rhythms', paragraphs:[
          'Project Meaning also offers an optional ambient sound with selectable pulse rates and discusses alpha and delta rhythms. A sound setting is an optional accompaniment; the heart practice does not require it.',
          'Its source code mentions Lustenberger and colleagues’ 2015 study of 10 Hz activity and creativity. The researchers used electrical stimulation applied through scalp electrodes, not binaural beats or an audio track. The experiment therefore cannot establish that this site’s sound produces the same brain activity, creativity change, sleep or relaxation.' ], refs:['lustenberger']}
      ];
      const bodyTheory=[
        {title:'The body as a source of information', paragraphs:[
          'Project Meaning treats bodily sensation as an entry point into feeling. Its central idea is that an apparently undivided mood can be examined through its sensory features and the meanings that form around them.',
          'Interoception research concerns how signals from within the body are sensed and represented. Sensations can contribute to emotional experience, but a particular location, texture or movement does not uniquely identify an emotion. Context, interpretation and individual differences matter.',
          'The project’s stronger statement that sensation simply is emotion is a theoretical framing, not a settled finding established by the cited heart studies.' ], refs:['craig']},
        {title:'Fourteen vectors, fourteen shape cues', paragraphs:[
          'Signal Psiduction pairs each shape level with one vector. Circle represents awareness as an unbroken field; half-circle represents attention as a focus within that field. The later shapes introduce location and boundary, quality, intensity, time and rhythm, movement, direction, felt tone, impulse, coherence, meaning, confidence and responsiveness.',
          'These shape pairings are proposed memory cues for this practice. Some vectors depend on others: direction may be absent without movement; coherence compares aspects of experience; meaning is an interpretation. An unclear or absent quality is a valid observation.',
          'The number of selected vectors follows the shape’s position in the Signal training sequence, not its geometric edge count. Earlier vectors can remain present while attention moves among them; awareness is involved throughout, even when not singled out.' ], refs:['maia']},
        {title:'Find an anchor and refine noticing', paragraphs:[
          'The source suggests resting attention in one comfortable region and, if useful, lightly placing a hand there as a temporary anchor. The aim is steadiness of attention rather than making a sensation appear.',
          'Fine noticing compares nearby experiences, such as before and after a breath, or hand on the chest and hand lifted. Describe only what you notice; the two moments may not feel different.',
          'Project Meaning proposes that repeated observation can make personal patterns easier to recognise. This is a learning hypothesis for the practice, rather than proof that every person’s accuracy will improve over a particular number of weeks.' ], refs:[]},
        {title:'Confidence is different from accuracy', paragraphs:[
          'After describing a sensation, ask how close the description feels to what was experienced and how confident you are. Strong sensation, confidence and objective accuracy are different things.',
          'Garfinkel and colleagues distinguished objective heartbeat-detection accuracy, subjective confidence in bodily perception and awareness of the match between confidence and accuracy. Their experiment concerns heartbeat tasks; it does not validate an emotion inferred from a sensation.' ], refs:['garfinkel']},
        {title:'From sensation to meaning', paragraphs:[
          'Project Meaning traces a possible chain: sensation, what attracts attention, the interpretation that arises, and the action the body seems ready to take. Observing the chain can create space to consider an interpretation before acting on it.',
          'For example, a warm sensation may accompany a memory and an urge to move closer. Describe the sensation separately from the interpretation; the same sensation can have different meanings in different circumstances.',
          'The practice can also include noticing how a sensation changes or stays the same when attention or posture shifts. A change is an observation; its cause remains a question to investigate.' ], refs:[]}
      ];
      const streamTheory=[
        {title:"A living field of experience", paragraphs:[
          "Open Streaming begins by turning inward, usually with eyes closed, and following what unfolds. Images, inner speech, sounds, spatial impressions, sensations, emotions and meanings may move into and through one another. A stream can be vivid or subtle, visual or nonvisual; the inner eye is an invitation to inward attention, not a requirement to see pictures.",
          "One way to understand it is as an evolving field rather than a succession of isolated objects. A forest, for example, may include a point of view, movement, atmosphere and felt meaning as well as its visible features. As attention shifts, the field can reorganise around something previously in the background. This is a proposed way to describe experience, not a claim that the inner world is physically separate from the mind."
        ], refs:["zeman"]},
        {title:"Continuity through change", paragraphs:[
          "The movement may take many forms: a scene transforms, an association leads elsewhere, a sound changes the atmosphere, or a subtle feeling redirects attention. A connection can be spatial, sensory, emotional or meaningful without needing to be named or counted.",
          "Continuity does not mean maintaining a perfect picture or avoiding all gaps. A pause, uncertainty or change in clarity can be part of the experience. When something reappears, following it is enough. In this model, the developing capacity is to remain available to movement and return to it, rather than to force an unbroken sequence."
        ], refs:[]},
        {title:"Receptivity, agency and emergence", paragraphs:[
          "The stream can be received, gently shaped, or both. You might deliberately imagine a doorway and then encounter an unplanned landscape; that landscape may invite another choice. What arises and what is introduced are not always sharply separable.",
          "The proposed skill is flexible participation: staying open enough for novelty while being able to influence direction when it feels natural. Neither total passivity nor constant control is the goal. Research on mind wandering distinguishes intentionality from awareness, although it does not test this particular practice."
        ], refs:["seli"]},
        {title:"The inner world as a navigable space", paragraphs:[
          "An image need not be treated only as something observed. A scene can have depth, a sense of location and paths through it; attention may approach, enter, move through or leave it. An imagined tunnel or wormhole can provide initial momentum, after which the scene is free to develop in its own way.",
          "This suggests an advanced possibility: the stream is not only a flow of content but also a changing field in which a person can explore their own imagined position and movement. Spatial vividness varies greatly and is not a measure of success; words, sound, felt direction or an abstract sense of place are equally valid ways in."
        ], refs:[]},
        {title:"Perspective and the sense of self", paragraphs:[
          "An optional exploration is to imagine being a UFO moving through an inner landscape. Experience the movement from within the craft, looking forward toward a destination; then imagine seeing the craft from outside, already at that destination. The scene can continue to change as you follow it.",
          "This explores how the sense of identity, movement, place and perspective can shift within an unfolding stream. Moving between an immersed viewpoint and a view of the whole scene is an invitation to explore, not a required sequence or proof of an external event."
        ], refs:[]},
        {title:"Attention within the flow", paragraphs:[
          "Attention can rest on a detail while a wider scene remains implicit, or move from a foreground image to its surrounding atmosphere. It can also notice a shift without stopping the experience to analyse it. Immersion and gentle awareness are not necessarily opposites.",
          "A useful distinction is between experiencing something and noticing that you are experiencing it. Research on mind wandering suggests that awareness and intentionality can vary independently. The implication here is a possibility for practice, not evidence that constant self-observation is needed or beneficial."
        ], refs:["seli"]},
        {title:"Meaning as a changing context", paragraphs:[
          "Meaning is not only a label attached after an image appears. A remembered place may feel welcoming or threatening; that felt context can make different details salient and suggest where the stream goes next. A new image or association may in turn change the meaning of the scene.",
          "This is a proposed feedback between content, attention and interpretation. It offers a way to explore how an inner world develops without requiring a person to extract a fixed number of relationships. A connection may be noticed naturally, left unspoken or never arise at all."
        ], refs:[]},
        {title:"Discernment without breaking the stream", paragraphs:[
          "An experience can be spontaneous, intentionally imagined, influenced by a suggestion, inferred, or a mixture. Vividness, felt significance and confidence describe the experience; they do not by themselves establish the source or accuracy of an impression.",
          "During practice there is no need to interrupt the flow to classify every image. Afterwards, if reflecting, distinguish what was experienced from what it seemed to mean and from anything independently checked. This makes exploration more open as well as more discerning."
        ], refs:[]},
        {title:"What might become more flexible?", paragraphs:[
          "The theory proposes several capacities that could be explored: sustaining or returning to a flow, following transformations, moving between immersion and wider awareness, shifting imagined perspective, and choosing when to invite a direction. These are possibilities for observation, not a rigid sequence or a checklist to complete.",
          "A creative-incubation study found improved later performance on previously encountered unusual-uses problems after an undemanding task. It did not test this exercise or show that streaming improves general intelligence. The effects and transfer of this particular practice remain questions for direct study."
        ], refs:["baird"]},
        {title:"Imagining yourself as a UFO", paragraphs:[
          "One reported exercise describes a flight imagined from within a vehicle and then from outside, with the vehicle seen at its destination. As an optional adaptation, imagine that you are a UFO: let the feeling of being the craft and moving through space become part of your stream. You might direct the craft up, down or sideways, shifting between the forward view from within and an outside view of the craft at its destination when it feels natural.",
          "Notice how changing your imagined identity or viewpoint may alter the scene, your sense of movement and what arises next. You can follow those changes wherever they lead. This is an exploration in imagination; it does not require equipment, a fixed number of switches or a particular outcome."
        ], refs:[]},
        ...(stage.id==='open-streaming'?[]:[
        {title:'Shape practice: relationships and structure', paragraphs:[
          'A relationship states how two elements connect; a list of objects or properties does not by itself state that connection. The shape framework proposes organising identified relationships into an interconnected structure.',
          'Wave Psiduction gives this structured activity its place alongside Signal, Frequency and Oscillatory Psiduction. Open Streaming requires no prescribed shape or relationship count.' ], refs:[]}
        ])
      ];
      const frequencyTheory=[
        {title:'State, stream and energetic fluency',paragraphs:[
          'Frequency Psiduction proposes that the felt state of attention and emotion can influence what arises in the stream and how fluently it moves. A memory or image arising in the stream can also change that state.',
          'Energetic fluency describes the felt ease and continuity of the experience, not its speed or the number of images produced. A quiet stream may be fluid; changes and pauses are welcome.',
          'Frequency is used here as a description of lived experience, not as a claim that a feeling is a specific measurable brain-wave frequency.' ],refs:[]},
        {title:'Signal and heart foundations',paragraphs:[
          'Heart Activation brings attention to the heart area and invites a sincere feeling of love to arise, be sustained and deepen with the breath. Signal Psiduction explores bodily awareness through the fourteen named vectors, including location and boundary, quality, intensity, movement, felt tone, meaning and uncertainty.',
          'Bring their insights into the stream as a whole, noticing what changes without forcing an outcome.' ],refs:[]}
      ];
      const transmutationTheory=[
        {title:'Agency and felt experience',paragraphs:[
          'In this practice, felt energy describes the bodily character of a state. The Agency hexagram organises qualities you can practise alone or in combination and then recognise in choices and actions.',
          'The progression first changes how many qualities you hold and then changes how you distribute attention within each breath.' ],refs:[]}
      ];
      frequencyTheory.push(
        {title:'Shapes and felt qualities',paragraphs:[
          'In Frequency Practice, the selected shape helps you explore felt qualities within one activation. Through Octagon the preview offers a place for each selected quality; at the later shapes it offers four places to attend rather than requiring 9, 12, 30 or 120 feelings.',
          'A quality can be absent, mixed or uncertain. Frequency here describes the character of the experience, while the ambient sound controls select a separate audio pulse rate.'
        ],refs:[]}
      );
      streamTheory.unshift(
        {title:'Wave Psiduction and Open Streaming',paragraphs:[
          'Unity Psiduction brings together Signal, Frequency, Wave, Oscillatory and Synchronised Psiduction. Wave follows the consciousness stream and, when a shape is selected, explores the relationships within it.',
          'Open Streaming offers a way to follow experience without a prescribed shape or relationship count. The stream can include imagery, inner speech, sound, sensation, emotion, movement and meaning; visual vividness is not required.'
        ],refs:['zeman']},
        {title:'Relationship, interdependence and inference',paragraphs:[
          'A relationship identifies participants and how they connect. Interdependence asks whether and how the relationships constrain, enable or explain one another. An inference is a conclusion supported by those meanings and any stated conditions.',
          'For example, if A is 2 metres below B and B is 3 metres below C, A is 5 metres below C. The conclusion follows from the two height differences. A closed shape by itself does not establish causal feedback or a shared function.',
          'Clement and Gentner studied the use of connected relational systems in analogy; Kroger and colleagues compared relational complexity with difficulty produced by distractors. Their experiments inform the questions the practice can pose.'
        ],refs:['clement','kroger']}
      );
      const unitiveTheory=[
        {title:'Remembering by place', paragraphs:[
          'Choose a remembered or imagined location. Give an experience a precise place there and practise returning to it.' ],refs:['wagner']},
        {title:'Designing a cue', paragraphs:[
          'An invented association can help you recover the entry at a location. It can also call up a different entry elsewhere in the palace. Give the cue a precise consequence you can try on a later visit.' ],refs:[]},
        {title:'Trying the connections', paragraphs:[
          'Trace one route from its beginning. Change a cue and see which later steps depend on it. When several routes lead to the same entry, try a different way in.' ],refs:[]}
      ];
      return {heart:heartTheory,body:bodyTheory,frequency:frequencyTheory,transmutation:transmutationTheory,stream:streamTheory,unitive:unitiveTheory}[mode];
    }
    const labReferences=Object.freeze({
      clement:{title:'Clement & Gentner (1991) · Systematicity in analogy',url:'https://groups.psych.northwestern.edu/gentner/papers/ClementGentner91.pdf',summary:'Three experiments examined how relations embedded in a common system influence analogical judgments and predictions.'},
      kroger:{title:'Kroger et al. (2002) · Relational complexity',url:'https://pubmed.ncbi.nlm.nih.gov/11950765/',summary:'A reasoning study varied relational complexity and compared it with difficulty increased by adding distractors.'},
      chekaf:{title:'Chekaf et al. (2018) · Compression and fluid intelligence',url:'https://pubmed.ncbi.nlm.nih.gov/29524237/',summary:'Performance on compressible colour sequences was associated with Raven’s matrices performance. This was not a trial of shape or breath-back training.'},
      wagner:{title:'Wagner et al. (2021) · Method of loci and durable memory',url:'https://pubmed.ncbi.nlm.nih.gov/33658191/',summary:'A mnemonic-training study investigated word-list memory and neural measures in people using the method of loci.'},
      zeman:{title:'Zeman et al. (2015) · Lives without imagery',url:'https://pubmed.ncbi.nlm.nih.gov/26115582/',summary:'A report of people describing lifelong absence of voluntary visual imagery. It illustrates variation in imagery; vivid pictures are not a prerequisite for the practice.'},
      seli:{title:'Seli et al. (2017) · Intentionality and awareness in mind wandering',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5572547/',summary:'Research distinguishes deliberate versus spontaneous mind wandering from whether a person is aware of it. It did not test consciousness streaming.'},
      baird:{title:'Baird et al. (2012) · Mind wandering and creative incubation',url:'https://pubmed.ncbi.nlm.nih.gov/22941876/',summary:'An undemanding task preceded improved later performance on previously encountered unusual-uses problems. The study did not test this method or general intelligence.'},
      armour:{title:'Armour (2008) · The intrinsic cardiac nervous system',url:'https://pubmed.ncbi.nlm.nih.gov/17981929/',summary:'Review of cardiac sensory, local-circuit and motor neurons and their interactions with central control. It does not establish memory of personal experiences in the heart.'},
      jankowski:{title:'Jankowski et al. (1998) · Oxytocin in the rat heart',url:'https://pubmed.ncbi.nlm.nih.gov/9826739/',summary:'Laboratory research found oxytocin and related signalling in rat cardiac tissue. The often-quoted atrium-to-uterus comparison is from rats, not a measurement of human feelings or stored memories.'},
      lehrer:{title:'Lehrer & Gevirtz (2014) · How HRV biofeedback may work',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4104929/',summary:'A review of respiration, resonance and baroreflex mechanisms. It discusses individual resonance, not a universal required breathing rate.'},
      balaji:{title:'Balaji et al. (2025) · HRV biofeedback app sessions',url:'https://www.nature.com/articles/s41598-025-87729-7',summary:'Observational analysis of 1.8 million sessions from users of a HeartMath app; 0.10 Hz was the most common coherence frequency. Sessions are not unique participants, and associations do not establish causation.'},
      bartels2000:{title:'Bartels & Zeki (2000) · Romantic love',url:'https://pubmed.ncbi.nlm.nih.gov/11117499/',summary:'An fMRI study of 17 people viewing partner and friend photographs found differences in activity across several brain regions. It did not test the present exercise.'},
      bartels2004:{title:'Bartels & Zeki (2004) · Maternal and romantic love',url:'https://pubmed.ncbi.nlm.nih.gov/15006682/',summary:'An fMRI comparison of maternal attachment with romantic-love findings. Its neural observations do not show that heart-focused breathing uniquely switches a particular network on or off.'},
      mccraty:{title:'McCraty et al. (1995) · Emotion and HRV spectra',url:'https://pubmed.ncbi.nlm.nih.gov/7484873/',summary:'The authors reported differences in short-term HRV spectral patterns during self-induced anger and appreciation. The abstract alone does not establish the source page’s claim that breathing was matched.'},
      lenguyen:{title:'Le Nguyen et al. (2019) · Loving-kindness meditation and telomeres',url:'https://pubmed.ncbi.nlm.nih.gov/31185369/',summary:'A 12-week randomised study of 142 adults compared loving-kindness, mindfulness and a waitlist. The loving-kindness group showed less telomere shortening than the waitlist; the mindfulness result was intermediate and not significantly different from either. It did not test this heart exercise.'},
      corrigendum:{title:'Le Nguyen et al. (2019) · Published correction',url:'https://pubmed.ncbi.nlm.nih.gov/31526525/',summary:'The authors corrected transposed group sample sizes in the original report.'},
      ekman:{title:'Ekman, Davidson & Friesen (1990) · Duchenne smiles',url:'https://pubmed.ncbi.nlm.nih.gov/2319446/',summary:'Compared smiles with and without eye-muscle involvement and associated measures of experience and brain activity. A smile pattern alone cannot reliably certify a feeling as genuine.'},
      gross:{title:'Gross & Levenson (1997) · Suppressing emotional expression',url:'https://pubmed.ncbi.nlm.nih.gov/9103721/',summary:'In an experiment with 180 women viewing films, instructions to suppress expression altered responses including cardiovascular sympathetic activity. Suppression is a different intervention from cultivating a felt sense of care.'},
      lustenberger:{title:'Lustenberger et al. (2015) · Frontal alpha activity and creativity',url:'https://pubmed.ncbi.nlm.nih.gov/25913062/',summary:'A small randomised crossover experiment investigated 10 Hz transcranial electrical stimulation and a creativity measure. It did not test binaural beats or the ambient audio on this site.'},
      maia:{title:'Mehling et al. (2018) · Dimensions of bodily awareness',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC6279042/',summary:'The MAIA-2 study used self-report to examine multiple dimensions of bodily awareness. It does not test this shape progression.'},
      craig:{title:'Additional background: Craig (2002) · Interoception',url:'https://pubmed.ncbi.nlm.nih.gov/12154366/',summary:'A review of bodily physiological representation and possible relationships with feeling and self-awareness. Added as background; not a specific study cited on Project Meaning.'},
      garfinkel:{title:'Additional background: Garfinkel et al. (2015) · Accuracy and awareness',url:'https://pubmed.ncbi.nlm.nih.gov/25451381/',summary:'Distinguishes heartbeat-detection performance, subjective sensibility and confidence–accuracy correspondence. Added as background; not a study cited on Project Meaning.'}
    });
    function renderLabTheory(){
      const topic=labLessonKey(),sections=laboratoryTheory(topic),refs=[...new Set(sections.flatMap(s=>s.refs))];
      const projectMeaningTopic=topic==='heart'||topic==='body';
      q('[data-lab-source]').hidden=!projectMeaningTopic;
      if(refs.includes('lenguyen'))refs.splice(refs.indexOf('lenguyen')+1,0,'corrigendum');
      q('[data-lab-theory]').innerHTML=`<div class="lab-theory-heading"><p class="eyebrow">GO DEEPER</p><h2>Theory and research</h2><p>Explore ${esc(labMode==="frequency"?labNames.frequency:labNames[labMode])}, its place within Unity Psiduction, and the research relevant to its ideas.</p></div>${sections.map(section=>`<details class="lab-theory-section"><summary>${esc(section.title)}</summary><div>${section.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}${section.refs.length?`<p class="lab-related">Related research: ${section.refs.map(key=>`<a href="${labReferences[key].url}" target="_blank" rel="noopener noreferrer">${esc(labReferences[key].title)}</a>`).join(' · ')}</p>`:''}</div></details>`).join('')}${refs.length?`<section class="lab-references" aria-label="Research studies"><h3>Research and sources</h3><p>Open a study to read its original abstract or article.</p>${refs.map(key=>{const r=labReferences[key];return `<article><h4><a href="${r.url}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a></h4><p>${esc(r.summary)}</p></article>`;}).join('')}</section>`:''}${projectMeaningTopic?`<p class="lab-original">Project theory and exercises: <a href="https://o0ooooooooooo0o.github.io/Project-Meaning/" target="_blank" rel="noopener noreferrer">Project Meaning ↗</a></p>`:''}`;
      if(topic==='stream'){
        const details=document.createElement('details');
        details.className='lab-theory-section wave-research';
        const summary=document.createElement('summary');
        summary.textContent='Interdependence, inference and the shape progression';
        details.append(summary,document.getElementById('wave-reasoning-material').content.cloneNode(true));
        if(WAVE[stage.id]){
          const formal=document.createElement('details');
          formal.className='lab-theory-section';
          const pairing=WAVE[stage.id], exampleModel=stage.id==='sphere'?WAVE.geodesic:pairing;
          const isMap=stage.relationCount>12;
          const title=isMap?'Numbered relationships · park map':'Numbered relationships in this example';
          formal.innerHTML=`<summary>Current example · ${esc(stage.name)} · ${esc(pairing.name)}</summary><p>${esc(pairing.why)}</p><p>${esc(pairing.example)}</p><p>${esc(pairing.check)}</p><details><summary>${esc(title)}</summary>${isMap?'<p>The park map is a separate example when the shape explanation uses a geometric construction.</p>':''}<ol>${exampleModel.relationships.map(r=>'<li>'+esc(r)+'</li>').join('')}</ol></details>`;
          details.append(formal);
        }
        q('[data-lab-theory]').querySelector('.lab-theory-heading').after(details);
      }
    }
    function renderLab() {
      const topic=labLessonKey(),lessons=laboratoryLessons(topic);labPage=Math.max(0,Math.min(labPage,lessons.length-1));const lesson=lessons[labPage];
      renderLabTheory();
      q('[data-lab-tabs]').innerHTML=labOrder.map(name=>`<button type="button" data-lab-tab="${name}" aria-pressed="${labMode===name}">${esc(labNames[name])}</button>`).join('');
      const modules=q('[data-lab-modules]');modules.hidden=labMode!=='frequency';
      modules.innerHTML=Object.keys(labModuleNames).map(name=>`<button type="button" data-lab-module="${name}" aria-pressed="${labModule===name}">${esc(labModuleNames[name])}</button>`).join('');
      const nextLabel=labMode==='frequency'&&labModule!=='transmutation'?'Next: '+labModuleNames[labModule==='integrated'?'heart':'transmutation']+' →':labOrder.indexOf(labMode)<labOrder.length-1?'Next: '+labNames[labOrder[labOrder.indexOf(labMode)+1]]+' →':'Back to practice';
      const progressName=labMode==='frequency'?labNames.frequency+' · '+labModuleNames[labModule]:labNames[labMode];
      q('[data-lab-content]').innerHTML=`<p class="eyebrow lab-progress">${String(labPage+1).padStart(2,'0')} / ${String(lessons.length).padStart(2,'0')} · ${esc(progressName)}</p><h2 tabindex="-1" data-lab-heading>${esc(lesson.title)}</h2><p class="lab-body">${esc(lesson.body)}</p><div class="lab-try"><p class="eyebrow">Try it</p><p>${esc(lesson.try)}</p></div><details class="lab-example"><summary>See an example</summary><p>${esc(lesson.example)}</p></details><div class="lab-nav"><button type="button" class="text-button" data-lab-previous ${labPage===0?'disabled':''}>← Previous</button><button type="button" class="button secondary" data-lab-next>${labPage===lessons.length-1?esc(nextLabel):'Next →'}</button></div>`;
      all('[data-lab-tab]').forEach(el=>el.addEventListener('click',()=>{labMode=el.dataset.labTab;labPage=0;renderLab();q('[data-lab-tab="'+labMode+'"]').focus();}));
      all('[data-lab-module]').forEach(el=>el.addEventListener('click',()=>{labModule=el.dataset.labModule;labPage=0;renderLab();q('[data-lab-module="'+labModule+'"]').focus();}));
      q('[data-lab-previous]').addEventListener('click',()=>{if(labPage>0){labPage--;renderLab();q('[data-lab-heading]').focus();}});
      q('[data-lab-next]').addEventListener('click',()=>{if(labPage<lessons.length-1){labPage++;renderLab();q('[data-lab-heading]').focus();}else if(labMode==='frequency'&&labModule!=='transmutation'){labModule=labModule==='integrated'?'heart':'transmutation';labPage=0;renderLab();q('[data-lab-heading]').focus();}else {const next=labOrder.indexOf(labMode)+1;if(next<labOrder.length){labMode=labOrder[next];labModule='integrated';labPage=0;renderLab();q('[data-lab-heading]').focus();}else closeLab();}});
    }
    function openLab(){if(clock?.snapshot().status==='running')pause();testAudio.stop();labMode=exercise==='body'?'signal':['frequency','heart'].includes(exercise)?'frequency':exercise;labModule=exercise==='heart'?'heart':exercise==='frequency'&&frequencyModule==='transmutation'?'transmutation':'integrated';labPage=0;renderLab();q('[data-practice-surface]').hidden=true;q('[data-lab-surface]').hidden=false;q('[data-lab-title]').focus();q('[data-lab-surface]').scrollIntoView({block:'start'});}
    function closeLab(){q('[data-lab-surface]').hidden=true;q('[data-practice-surface]').hidden=false;q('[data-open-lab]').focus();}
    function mountLociProgression() {
      const container=q('[data-loci-progression]');
      if(!container)return;
      let index=lociExampleIndex;
      function draw(focus) {
        lociExampleIndex=index;
        const shape=D.STAGES[index], lesson=currentLociLesson(shape.id);
        const before=index?D.STAGES[index-1].name:null;
        container.innerHTML=`<div class="loci-progression-head"><span>${String(index+1).padStart(2,'0')} / ${D.STAGES.length}</span><strong>${before?esc(before)+' → ':''}${esc(shape.name)}</strong></div><div class="loci-progression-grid"><div class="loci-progression-copy"><h4 data-loci-progress-title tabindex="-1">${esc(lesson.name)}</h4><p>${esc(lesson.prompt)}</p><p class="loci-recall-check">${esc(lesson.check)}</p></div><div class="loci-progression-symbol" aria-label="${esc(shape.name)}"><span class="loci-progress-icon" aria-hidden="true">${G.miniIcon(shape.id,140)}</span><strong>${esc(shape.name)}</strong><small>${esc(lociScale(shape))}</small></div><div class="loci-progression-copy"><h4>Example</h4><p>${esc(lesson.example)}</p></div></div><div class="loci-progression-nav"><button type="button" class="text-button" data-loci-prev ${index===0?'disabled':''}>← Previous example</button><button type="button" class="text-button" data-loci-next ${index===D.STAGES.length-1?'disabled':''}>Next example →</button></div>`;
        container.querySelector('[data-loci-prev]').addEventListener('click',()=>{if(index>0){index--;draw(true);}});
        container.querySelector('[data-loci-next]').addEventListener('click',()=>{if(index<D.STAGES.length-1){index++;draw(true);}});
        if(focus)container.querySelector('[data-loci-progress-title]').focus({preventScroll:true});
      }
      draw(false);
    }
    function render() {
      if (agencyMap) agencyMap.destroy();
      agencyMap=null;
      agencyLastFrame=null;
      if (isTransmutation()) pacing='paced';
      modelState=0;selectedRelationship='';walkthroughStep=0;
      previewLociCue=false;
      const guide = stage[guideId()], ready=store.data.readiness[stage.id]||{};
      const wave = exercise === 'stream' ? WAVE[stage.id] : null;
      host.innerHTML=`<div data-practice-surface><div class="training-topline"><a class="back-link" href="#stage-path">↑ All shapes</a><label class="training-shape-picker" ${exercise==='open'?'hidden':''}>Shape <select data-shape aria-label="Choose a shape">${D.STAGES.map((s,i)=>`<option value="${esc(s.id)}" ${s.id===stage.id?'selected':''}>${String(i+1).padStart(2,'0')} · ${esc(s.name)}</option>`).join('')}</select></label></div>
        <h2 class="training-category-title" id="unity-psiduction-title">Unity Psiduction</h2>
        <div class="training-exercises" role="group" aria-labelledby="unity-psiduction-title">${['body','frequency','stream','unitive','open'].map(name=>`<button type="button" data-exercise="${name}" aria-pressed="${name==='frequency'?frequencyActive():exercise===name}">${exerciseNames[name]} <small hidden>${ready[name]?'Self-assessed: ready':''}</small></button>`).join('')}</div>
        ${exercise==='stream'?`
          <section class="open-introduction" aria-labelledby="wave-breath-title">
            <h2 id="wave-breath-title">Using the breath metronome</h2>
            <p>Tap Start in the shape. Each full breath is one n-back turn. As the metronome expands, inhale and notice a relationship. As it contracts, exhale and name it silently. For <strong>1-back</strong>, finish the exhale by recalling the previous breath’s relationship and comparing the two.</p>
            <p>On breath one, picture the wood holding a pencil’s core steady. On breath two, picture the core marking paper. What held it steady enough to make that mark? Use the same rhythm with every shape. For <strong>2-back</strong>, recall the relationship from two breaths ago.</p>
          </section>`:''}
        ${exercise==='unitive'?`
          <div class="training-body-steps loci-tabs" role="tablist" aria-label="Oscillatory Psiduction practice steps">
            ${LOCI_COURSE.map((step,i)=>`<button type="button" id="loci-tab-${i}" role="tab" data-loci-tab="${i}" aria-selected="${i===lociStep}" aria-controls="loci-panel" tabindex="${i===lociStep?0:-1}" ${i>unlockedLoci?'disabled':''}>${i+1} · ${esc(step.title)}</button>`).join('')}
          </div>
          <div id="loci-panel" role="tabpanel" aria-labelledby="loci-tab-${lociStep}">
          <section class="open-introduction loci-intro">
            <h2>${esc(LOCI_COURSE[lociStep].title)}</h2><p>${esc(LOCI_COURSE[lociStep].description)}</p>
            <p>Begin with placement at Circle. On later shapes, build the pattern one connection at a time across breaths.</p>
            <details class="loci-background"><summary>About Oscillatory Psiduction and the method of loci</summary><p>Oscillatory Psiduction is the practice of learning to oscillate between the world you encounter through inner sight and the vision you give those experiences through memory mapping and the connections you forge between them.</p><p>As the stream unfolds, you give an experience a place in a remembered imagined space. You can later return to that place, recall the experience and connect it with what is unfolding now. In doing so, you move between the present stream and the experiences you have mapped.</p><p>Mapping also brings you into relationship with the state in which an experience was encoded. You can revisit a remembered frequency and practise returning to it, while recognising the states and strategies connected to earlier experiences. These memories can become experiences you re-enact and learn to synchronise with, carrying the practice into Synchronised Psiduction, the fifth stage.</p><p>The <a href="https://www.laits.utexas.edu/memoria/Cicero.html" target="_blank" rel="noopener noreferrer">method of loci</a>, or memory palace, is an ancient technique traditionally attributed to the Greek poet Simonides of Ceos and described by Cicero in <em>De Oratore</em>. To learn its basic principle, imagine placing an image at a remembered doorway, then returning to that doorway to retrieve it. From there, the locations and the kinds of places you use are yours to imagine and create.</p><p>In Oscillatory Psiduction, you give memories their own cues and build paths among the entries in your palace. The relationships you recognise in Wave Psiduction can guide the connections you make between what you map; those connections can, in turn, reveal new relationships as your stream unfolds. The two practices feed one another, cycling experiences, meanings and their felt energies between the present stream and memory.</p></details>
            <div class="loci-progression" data-loci-progression aria-label="Shape-by-shape memory progression"></div>
          </section>`:''}
        ${exercise==='open'?`<section class="open-introduction" aria-labelledby="open-introduction-title"><h2 id="open-introduction-title">Bringing the practice together</h2><p>Throughout these modules, you’ve been learning to stay aware of each event as it unfolds in consciousness. You’ve learned to let a sincere feeling of love arise from the heart, breathe with it and sustain and deepen its felt signal. Through Transmutation, you’ve practised honing a particular felt frequency and returning to it from a different state. With the method of loci, you’ve learned to map events in your stream to places along a familiar route, so that revisiting a place brings the event back to mind.</p><p>Now you’re ready to bring it all together. In Synchronised Psiduction, let these skills begin to work on autopilot while you stream. Stay aware as one event gives way to the next. As a memory surfaces, you might feel your breathing change. You can bring that bodily response into focus, sense the shift in your felt frequency and encode it at a familiar place. You can tune back to a frequency you remember or follow a new connection between the memory and what’s unfolding now. Let the stream itself suggest what comes next.</p><h2>Four meanings of synchronisation</h2><p><strong>First · Signal Psiduction.</strong> Synchronise with the body. Bring the sensations you have learned to notice into awareness as the stream unfolds. Notice their location, quality, intensity and movement, and how a sensation and an event in consciousness influence one another.</p><p><strong>Second · Frequency Psiduction.</strong> Synchronise with your felt state. Attend to the frequency you are experiencing, including the feeling of love cultivated through Heart Activation and the qualities explored through Transmutation. Notice how that state shapes the contents of consciousness and how those contents can, in turn, change the state. Practise returning to and adjusting a frequency as the stream continues.</p><p><strong>Third · Wave Psiduction.</strong> Synchronise with the movement and relationships within the stream. Let images, thoughts, sensations, feelings and meanings unfold, and notice the relationships and interdependencies that emerge among them. In this framework, a change in consciousness may involve a change in how these events come together and influence one another.</p><p><strong>Fourth · Oscillatory Psiduction.</strong> Synchronise the present stream with what you have mapped in memory. Move between the experience arising now and the places, connections and states you have encoded. Return to an earlier experience or frequency and bring it into relationship with the present, so that an embodied state and its associated strategies can be recognised and re-enacted.</p><p>Together, these four practices can move as one: bodily signals, felt frequency, the evolving stream and remembered experience continually inform one another. The project also proposes that each point of synchronisation has an internal and an external aspect, with consciousness, bodily action and the surrounding world meeting through movement in time and space. Within this framework, dimensional and energetic alignment may influence which possible realities become available to explore in consciousness. This proposed correspondence between inner and outer experience is at the heart of psi in the project.</p></section>`:''}
        ${frequencyActive()?`<div class="training-body-steps training-frequency-modules" role="group" aria-label="Frequency Psiduction modules">${['integrated','heart','transmutation'].map(name=>`<button type="button" data-frequency-module="${name}" aria-pressed="${name==='heart'?exercise==='heart':exercise==='frequency'&&frequencyModule===name}">${name==='integrated'?'Frequency Practice':name==='heart'?'Heart Activation':'Transmutation'}</button>`).join('')}</div>`:''}
        ${isTransmutation() ? `
          <section class="open-introduction tm-intro" aria-labelledby="tm-intro">
            <h2 id="tm-intro">Transmutation</h2>
            <p>Begin as you did in Heart Activation. Let love arise from the heart, then shift into devotion and feel what changes. Bring back the quality you explored on the star below.</p>
            <p>At Circle, stay with one quality for a full inhale and exhale. At the next inhale, enter the next quality. The next four shapes build blends of two, three, four and five. From Hexagon onwards, keep five present and follow the shading to expand or soften each quality.</p>
            <p>The Agency hexagram is an example you can adapt or draw for yourself. Its twelve families represent qualities associated with the capacity to choose and act. Practise calling them up alone and together until you can recognise agency as a whole felt state.</p>
            <p><strong>Energetic → emotional → meaning entrainment</strong> begins with a bodily shift. You might feel yourself steady, recognise resolve and sense what “I choose” means. As with love in Heart Activation, repeated practice may make that state easier to enter and sustain. This model proposes “cellular learning” as a possible explanation for how the nervous system comes to recognise agency more deeply.</p>
          </section>
          <section data-transmutation-map aria-label="Agency hexagram"></section>` : ''}
        ${exercise==='body'&&stage.id!=='open-streaming'?`<p class="signal-cycle-intro"><strong>${esc(stage.name)} · ${signalLimit()} ${signalLimit()===1?'vector':'vectors'}</strong> — This shape brings ${signalLimit()===1?'one vector':'these '+signalLimit()+' vectors'} into practice and invites you to notice how ${signalLimit()===1?'it informs your experience':'they influence and depend on one another'}. Follow the highlighted vector for one complete inhale and exhale. At the next inhale, move to the next vector; continue in order, returning to the first until your chosen time ends. The bell marks each inhale and exhale.</p>`:''}
        ${exercise==='heart'?`<p class="heart-progression-intro">Begin by bringing a sincere feeling of love forward from the heart. Each shape builds on the last, applying what you learned in Signal Psiduction to notice, deepen and sustain that feeling throughout your experience.</p>`:''}
        <header ${isTransmutation()?'hidden':''} class="training-symbol-header${wave?' wave-header':''}"><h1 class="visually-hidden">${exercise==='open'?'Synchronised Psiduction':esc(stage.name)+(wave?' · '+esc(wave.name):'')}</h1><div class="training-page-symbol${exercise==='open'||stage.id==='open-streaming'?' training-page-symbol--open':stage.id==='half-circle'?' training-page-symbol--half-circle':''}"><span class="training-shape-ink" aria-hidden="true">${exercise==='open'||stage.id==='open-streaming'?'':G.miniIcon(stage.id,65).replace('viewBox="0 0 240 240"',stage.id==='half-circle'?'viewBox="24 59 192 106"':'viewBox="24 24 192 192"')}</span>${exercise==='open'?'':signalShapeLabels()}<div class="training-pacer" data-pacer><div data-orb class="training-orb" aria-hidden="true"></div>${wave?`<span class="wave-medallion"><small>${esc(stage.name)}</small><strong>${esc(wave.name)}</strong></span>`:''}<button type="button" class="training-pacer-start" data-start-orb aria-label="Start practice">Start</button><div class="training-breath-readout" data-breath-readout hidden><span data-breath-label aria-live="polite">Ready</span><small data-breath-count aria-hidden="true"></small></div></div></div><aside class="training-signal-explanation" data-signal-explanation hidden aria-label="${exercise==='open'?'Synchronised Psiduction guidance':'Shape pairing explanation'}"><div data-pair-details>${exercise==='open'?`<p class="eyebrow training-current-step">A RETURN TO THE STREAM</p><p class="training-prompt">Come back to this practice whenever you like. Notice what now arises naturally, without trying to use every skill.</p><p class="training-fine">You can begin here, or return after practising the other categories.</p>`:''}${wave?`<p class="eyebrow training-current-step">Picture this</p><p class="training-prompt">${esc(wave.example)}</p><p class="training-fine">${esc(wave.check)}</p><div class="wave-selected-relationship" data-wave-relationship ${stage.relationCount>12?'hidden':''} aria-live="polite"><span class="visually-hidden" data-wave-selected></span>`:''}<p class="eyebrow training-current-step" data-signal-pair></p><div class="training-prompt" data-signal-pairing></div><p class="training-fine" data-signal-example></p>${wave?'</div>':''}</div><div class="training-heart-instructions" data-heart-instructions hidden aria-label="Heart activation guidance"><p class="eyebrow training-current-step" data-heart-step></p><p class="training-prompt" data-heart-prompt aria-live="polite"></p><div class="training-body-instructions" data-unitive-body hidden aria-label="Body sensation guidance"><p class="eyebrow training-current-step" data-unitive-body-label></p><p class="training-prompt" data-unitive-body-prompt></p></div></div></aside></header>
        <div data-storage class="training-notice" role="status" hidden></div><p data-message class="training-message" role="status">${esc(announcement)}</p>
        <div class="training-layout"><div class="training-primary"><section class="training-panel" aria-labelledby="exercise-title">
          <div class="training-panel-heading"><div><p class="eyebrow">THE EXERCISE</p><h2 id="exercise-title">${exercise==='heart'?'Frequency Psiduction · Heart Activation':exercise==='frequency'&&frequencyModule==='transmutation'?'Frequency Psiduction · Transmutation':exerciseNames[exercise]}</h2></div><div class="training-panel-controls"><span data-session-state class="training-state">At your own pace</span></div></div>
          <div data-live><div class="training-session-bar" data-session-bar><span data-timer aria-label="Time remaining" hidden>15:00</span><div><button type="button" class="text-button" data-start-toolbar>Start</button><button type="button" class="text-button" data-pause hidden>Pause</button><button type="button" class="text-button" data-end hidden>End practice</button></div></div>
            <div class="training-exercise-preview" data-exercise-preview>

              <div class="training-cue"><p data-step-label class="eyebrow training-current-step"></p><h3 data-dimension class="training-dimension" hidden></h3><p data-prompt class="training-prompt" aria-live="polite" aria-atomic="true"></p><ul data-signal-questions class="signal-reflection-questions" aria-label="Questions for reflection" hidden></ul><p data-next-step class="training-fine"></p>${wave?`<details class="wave-detail"><summary>Explore ${esc(wave.name)}</summary><p>${esc(wave.note)}</p>${wave.reach?`<p>${esc(wave.reach)}</p>`:''}</details><details class="wave-detail wave-abstract"><summary>Abstract</summary><p>${esc(wave.abstract.definition)}</p><p><strong>${esc(wave.abstract.label)}.</strong> ${esc(wave.abstract.check)}</p></details>`:''}</div><button type="button" class="text-button training-live-pace" data-live-pace hidden>Use my own rhythm</button>
            </div>
            <div class="training-progress" role="progressbar" aria-label="Session time elapsed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden><span data-fill></span></div>
            <p data-finished class="training-finish" hidden>Practice complete.</p></div>
          <div class="training-config" aria-label="Practice settings">
          <form class="training-rhythm" data-breath-form novalidate><div class="training-settings training-preset-grid"><label data-duration-field>Length<select data-duration>${(exercise==='stream'||exercise==='open'?E.STREAM_DURATIONS:(exercise==='heart'||exercise==='unitive')?E.HEART_DURATIONS:E.BODY_DURATIONS).map(m=>`<option value="${m}" ${m===duration?'selected':''}>${m<60?m+' minutes':m/60+(m===60?' hour':' hours')}</option>`).join('')}</select></label><label>Breathing<select data-pacing><option value="natural" ${(exercise==='body'||isTransmutation())?'disabled hidden':''} ${pacing==='natural'?'selected':''}>My own rhythm</option><option data-paced-option value="paced" ${pacing==='paced'?'selected':''}>${rhythmLabel()}</option></select></label><label>Inhale (seconds)<input data-inhale type="number" inputmode="decimal" min="0.1" step="any" required value="${inhaleSeconds}" aria-describedby="rhythm-help"></label><label>Exhale (seconds)<input data-exhale type="number" inputmode="decimal" min="0.1" step="any" required value="${exhaleSeconds}" aria-describedby="rhythm-help"></label></div><p id="rhythm-help" class="training-fine">Choose your rhythm, then Start.</p><button type="submit" class="button secondary" data-apply-rhythm hidden>Apply rhythm</button><p class="training-fine training-rhythm-current" data-rhythm-current hidden>Guide: ${rhythmLabel()}.</p><p class="training-fine" data-rhythm-status role="status"></p></form>
          <div class="training-sound-row"><details class="training-sound"><summary>Sound settings <span data-sound-summary>${soundSummary()}</span></summary><label class="training-check"><input type="checkbox" data-bell ${bell?'checked':''}> Enable bell sound</label><label class="training-check"><input type="checkbox" data-sound ${sound?'checked':''}> Enable ambient sound</label><div class="training-settings"><label>Ambient pulse<select data-frequency>${[0,1,2,3,8,10,12].map(f=>`<option value="${f}" ${f===frequency?'selected':''}>${f===0?'Off · bells only':f+' Hz'}</option>`).join('')}</select></label><label>Bell volume <output data-volume-label>${Math.round(bellVolume*100)}%</output><input data-volume type="range" min="0" max="1.5" step="0.01" value="${bellVolume}" aria-label="Bell volume"></label></div><button type="button" class="text-button" data-test-sound>Test bell</button><p class="training-fine" data-sound-status role="status"></p><p class="training-fine" data-bell-help>Bells mark each inhale and exhale with the guide. Own rhythm keeps only the finish bell.</p></details><button type="button" class="text-button training-bell-toggle" data-bell-toggle aria-pressed="${bell}" aria-label="${bell?'Mute bell sound':'Enable bell sound'}">Bell: ${bell?'on':'off'}</button></div>

          </div>
        </section>
        ${exercise==='unitive' && lociStep<LOCI_COURSE.length-1?`<div class="loci-step-next"><button type="button" class="button secondary" data-loci-continue>Continue to ${esc(LOCI_COURSE[lociStep+1].title)} →</button></div>`:''}
        <div class="lab-open-wrap"><button type="button" class="button secondary" data-open-lab disabled><span>Learn more</span><span class="lab-coming-soon">Coming Soon</span></button></div>
        <details hidden data-return class="training-panel training-return"><summary>Private notes</summary><p class="training-fine">Pause to write. Entries, not timer breaths, set the return distance.</p><form data-return-form><div data-fields></div><button type="submit" class="button primary" data-keep>Keep this entry</button><p class="training-fine">Saved in this browser.</p></form></details>
        <section hidden data-readiness class="training-panel training-readiness"></section>
        </div></div>
        ${exercise==='unitive'?'</div>':''}
        <section class="training-reference" aria-label="${esc(stage.name)} worked reference" data-reference hidden>${workedExampleHTML(guide)}</section>
        <details hidden class="training-record"><summary>Your practice record <span data-record-count></span></summary><p class="training-fine">Downloads include your private notes.</p><div data-record></div><div class="training-record-actions"><button type="button" class="text-button" data-export>Download practice record (includes notes)</button><button type="button" class="text-button" data-original hidden>Download original saved data</button><button type="button" class="text-button" data-reload hidden>Load saved version</button><button type="button" class="text-button" data-reset>Clear this practice record</button></div></details>
        <p hidden class="training-attribution">Heart and body exercises: <a href="https://o0ooooooooooo0o.github.io/Project-Meaning/" target="_blank" rel="noopener noreferrer">Project Meaning</a>. <a href="#palace">Earlier saved observations →</a></p></div>
        <section class="learning-lab" data-lab-surface hidden aria-labelledby="lab-title">
          <button type="button" class="text-button lab-back" data-close-lab>← Back to practice</button>
          <p class="eyebrow">LEARNING LABORATORY</p><h1 id="lab-title" data-lab-title tabindex="-1">Learn the practice</h1>
          <p class="lab-intro">Pick something to try. You can take as long as you like.</p>
          <div class="training-exercises lab-tabs" data-lab-tabs role="group" aria-label="Choose a learning topic"></div>
          <div class="training-body-steps lab-modules" data-lab-modules role="group" aria-label="Frequency Psiduction learning modules" hidden></div>
          <p class="lab-research-jump"><button type="button" class="text-button" data-lab-research-jump>Read the research ↓</button></p>
          <article class="lab-lesson" data-lab-content></article>
          <section id="lab-theory" class="lab-theory" data-lab-theory aria-label="Theory and research"></section>
          <p class="lab-source" data-lab-source hidden>Heart and body guidance adapted from <a href="https://o0ooooooooooo0o.github.io/Project-Meaning/" target="_blank" rel="noopener noreferrer">Project Meaning</a>.</p>
        </section>`;
      mountAgencyPractice();
      mountLociProgression();
      function openLociStep(index) {
        if (runningSession() || index > unlockedLoci || index === lociStep) return;
        const route = LOCI_COURSE[index].route;
        onExerciseChange(route);
        showRoute(route);
        q('[data-loci-tab="'+index+'"]').focus();
      }
      all('[data-loci-tab]').forEach(tab => {
        const index = Number(tab.dataset.lociTab);
        tab.addEventListener('click', () => openLociStep(index));
        tab.addEventListener('keydown', event => {
          const targets = {ArrowRight:(index+1)%(unlockedLoci+1),
            ArrowLeft:(index+unlockedLoci)%(unlockedLoci+1), Home:0, End:unlockedLoci};
          if (!Object.hasOwn(targets, event.key)) return;
          event.preventDefault();
          openLociStep(targets[event.key]);
        });
      });
      q('[data-loci-continue]')?.addEventListener('click', () => {
        if (runningSession() || lociStep === LOCI_COURSE.length-1) return;
        const next = lociStep+1;
        unlockedLoci = Math.max(unlockedLoci, readLociProgress(), next);
        try { storage?.setItem(lociProgressKey, String(unlockedLoci)); } catch (_) {}
        openLociStep(next);
      });
      q('[data-open-lab]').addEventListener('click',openLab);
      q('[data-close-lab]').addEventListener('click',closeLab);
      q('[data-lab-research-jump]').addEventListener('click',()=>q('[data-lab-theory]').scrollIntoView({behavior:'smooth',block:'start'}));
      q('[data-shape]').addEventListener('change',e=>onStageChange(e.target.value,routeMode()));
      q('[data-model-state]')?.addEventListener('change',event=>selectWorkedEntry(Number(event.target.value)));
      q('[data-model-relation]')?.addEventListener('change',event=>{selectedRelationship=event.target.value;updateExplorer();});
      bindRegister();updateExplorer();renderWalkthrough();
      all('[data-exercise]').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.exercise===exercise||(el.dataset.exercise==='frequency'&&frequencyActive()))return;end();clock=null;exercise=el.dataset.exercise;if(exercise==='frequency'&&frequencyModule==='heart')frequencyModule='integrated';onExerciseChange(routeMode());shapeFocus=0;pacing=pacingByExercise[exercise];duration=15;peek=null;lastPrompt='';announcement='';render();q('[data-exercise="'+exercise+'"]').focus();}));
      all('[data-frequency-module]').forEach(el=>el.addEventListener('click',()=>{const next=el.dataset.frequencyModule;if((next==='heart'&&exercise==='heart')||(exercise==='frequency'&&frequencyModule===next))return;end();clock=null;exercise=next==='heart'?'heart':'frequency';frequencyModule=next;onExerciseChange(routeMode());shapeFocus=0;pacing=pacingByExercise[exercise];duration=15;peek=null;lastPrompt='';announcement='';render();q('[data-frequency-module="'+next+'"]').focus();}));
      q('[data-duration]').addEventListener('change',e=>{duration=Number(e.target.value);tick();});
      q('[data-pacing]').addEventListener('change',e=>setPacing(e.target.value));
      q('[data-breath-form]').addEventListener('submit',event=>{event.preventDefault();applyBreathTiming();});
      q('[data-start-orb]').addEventListener('click',()=>{const status=clock?.snapshot().status;if(status==='running')pause();else if(status==='paused')resume();else start();});
      q('[data-start-toolbar]').addEventListener('click',start);
      q('[data-pause]').addEventListener('click',()=>clock.snapshot().status==='running'?pause():resume());
      q('[data-end]').addEventListener('click',end);
      q('[data-live-pace]').addEventListener('click',()=>setPacing(pacing==='natural'?'paced':'natural'));
      q('[data-bell-toggle]').addEventListener('click',()=>setBell(!bell));
      q('[data-bell]').addEventListener('change',e=>setBell(e.target.checked));
      q('[data-sound]').addEventListener('change',e=>{sound=e.target.checked;refreshAudio();q('[data-sound-summary]').textContent=soundSummary();});
      q('[data-frequency]').addEventListener('change',e=>{frequency=Number(e.target.value);bellVolume=volumes[frequency];q('[data-volume]').value=bellVolume;q('[data-volume-label]').textContent=Math.round(bellVolume*100)+'%';refreshAudio();});
      q('[data-volume]').addEventListener('input',e=>{bellVolume=Number(e.target.value);volumes[frequency]=bellVolume;q('[data-volume-label]').textContent=Math.round(bellVolume*100)+'%';refreshAudio();});
      q('[data-test-sound]').addEventListener('click',()=>{
        if(bellVolume<=0){soundStatus('Bell volume is at 0%. Raise it, then test again.');return;}
        soundStatus('');
        if(sessionAudioFailed && clock?.snapshot().status==='running' && audioEnabled())startAudio();
        if(!testAudio.start({frequency:0,bellVolume})){soundFailure();return;}
        if(testAudio.preview()===false)soundFailure();
      });
      all('[data-signal-vector]').forEach(el=>el.addEventListener('click',()=>{if(exercise==='body'&&runningSession())return;if(exercise==='body')signalFocus=Number(el.dataset.signalVector);else shapeFocus=Number(el.dataset.signalVector);if(exercise==='unitive')previewLociCue=true;lastPrompt='';tick();if(exercise==='stream')q('[data-wave-relationship]').hidden=false;}));
      q('[data-return]').addEventListener('toggle',()=>{if(q('[data-return]').open){pause();renderFields();}});
      q('[data-return-form]').addEventListener('submit',saveObservation);
      q('[data-export]').addEventListener('click',()=>download(store.exportJSON(),'practice-private'));
      q('[data-original]').addEventListener('click',()=>download(store.originalRaw,'original-recovery'));
      q('[data-reload]').addEventListener('click',()=>{if(!root.confirm('Load the saved version from this browser? Download this tab’s record first to keep any work that could not be saved. Unfinished notes stay in this tab.'))return;pause();const result=store.reload();if(result.ok){unsaved=false;renderStorage();renderReadiness();renderRecord();renderFields();message('Saved version loaded.');}else message(result.error);});
      q('[data-reset]').addEventListener('click',()=>{if(!root.confirm('Clear this browser’s new practice record, including private notes and self-assessments? Earlier archive data is kept. Download a copy first if you want to keep it.'))return;end();const result=store.reset();if(!result.ok){message(result.error);return;}clock=null;unsaved=false;drafts.clear();message('This practice record has been cleared.');render();});
      renderFields();renderReadiness();renderRecord();renderStorage();updateRhythmLabels();tick();
      q('[data-sound-summary]').textContent=soundSummary();
    }
    function renderFields() {
      const d=draft(), old=target(), h=history(), stale=staleReference(), draftKey=key(), generation=++fieldsGeneration;
      const isCurrent=()=>generation===fieldsGeneration&&key()===draftKey&&drafts.get(draftKey)===d;
      q('[data-fields]').innerHTML=`${stale?`<div class="training-notice" role="status"><p>The saved version no longer contains this return’s exact earlier entry. Your current selection, recollection and earlier source remain here; the target has not been changed.</p><button type="button" class="text-button" data-recover-return>Download this unfinished return and begin new history</button></div>`:''}<p class="training-return-phase">${d.revealed?'03 · Compare the preserved entries':d.locked?'02 · Retrieve the exact earlier entry':'01 · Receive and encode the current entry'}</p>
        <label class="training-field">My current relationship${stage.relationCount===1?'':'s'}<textarea data-note="source" rows="3" maxlength="3000" required ${d.locked?'readonly':''} placeholder="Preserve the selected relationships, their roles and meanings. This is the current entry, before deliberate retrieval.">${esc(d.source)}</textarea></label>
        <label class="training-lag">Return distance<select data-lag ${d.locked?'disabled':''}>${[1,2,3,4].map(n=>`<option value="${n}" ${n===d.lag?'selected':''}>${n} marked entr${n===1?'y':'ies'} back (N = ${n})</option>`).join('')}</select></label>
        <p class="training-fine">${h.length} entr${h.length===1?'y':'ies'} in this ${esc(stage.name)} / ${esc(exerciseNames[exercise])} stream. Each entry has its own home address. Extra breaths do not move this return distance.</p>
        ${old?`${!d.locked?`<button type="button" class="button secondary" data-lock-source>Encode current entry, then retrieve →</button><p class="training-fine">Keep the current selection first. Deliberate retrieval starts after this step.</p>`:`<label class="training-field">My recollection, before looking<textarea data-note="recollection" rows="2" maxlength="3000" ${d.revealed?'readonly':''} placeholder="Retrieve from the earlier address, or write ‘I do not recall’.">${esc(d.recollection)}</textarea></label><button type="button" class="text-button" data-reveal ${d.revealed?'disabled':''}>Keep recollection and reveal original →</button>`}
          <div class="training-original" ${d.revealed?'':'hidden'}><p class="eyebrow">PRESERVED ORIGINAL · ${d.lag} BACK</p><p>${d.revealed?esc(old.source):''}</p></div>`:`<p class="training-empty-return">Keep ${Math.max(0,d.lag-h.length)} more entr${d.lag-h.length===1?'y':'ies'} to create a ${d.lag}-back return. Encode the current relationships at their own address. This builds the history; no earlier target is invented.</p>`}
        ${d.revealed?`<label class="training-field">My comparison <span>(optional note)</span><textarea data-note="relation" rows="3" maxlength="3000" placeholder="${esc(stage[guideId()].relate)}">${esc(d.relation)}</textarea></label><label class="training-field">My correction or uncertainty <span>(optional note)</span><textarea data-note="revision" rows="2" maxlength="3000" placeholder="${esc(stage[guideId()].revise)}">${esc(d.revision)}</textarea></label><p class="training-fine">Compare the exact earlier entry with the encoded current one. Preserve both originals. A changed selection does not by itself make the earlier relationship false.</p>`:''}
        <button type="button" class="text-button" data-fresh>Begin a fresh observation stream</button>`;
      all('[data-note]').forEach(el=>el.addEventListener('input',()=>{const field=el.dataset.note;if(!isCurrent()||el.readOnly||(field==='source'&&d.locked)||(field==='recollection'&&d.revealed)||(['relation','revision'].includes(field)&&!d.revealed))return;d[field]=el.value;}));
      q('[data-lag]').addEventListener('change',e=>{if(!isCurrent()||d.locked)return;d.lag=Number(e.target.value);d.recollection='';d.revealed=false;renderFields();});
      q('[data-lock-source]')?.addEventListener('click',()=>{
        if(!isCurrent()||d.locked)return;
        if(!d.source.trim()){message('First select and describe the current relationships.');q('[data-note="source"]').focus();return;}
        d.reference={id:old.id,source:old.source};d.locked=true;renderFields();message('Current entry encoded. Now retrieve the exact earlier entry before looking.');q('[data-note="recollection"]').focus();
      });
      q('[data-reveal]')?.addEventListener('click',()=>{
        if(!isCurrent()||!d.locked||d.revealed)return;
        if(!d.recollection.trim()){message('Write what you remember, or “I do not recall”, before revealing the original.');q('[data-note="recollection"]').focus();return;}
        d.revealed=true;renderFields();message('Recollection kept. Compare both preserved entries, then append any correction.');q('[data-note="relation"]').focus();
      });
      q('[data-recover-return]')?.addEventListener('click',()=>{if(!isCurrent())return;download(JSON.stringify({kind:'unfinished-breath-back-return',stageId:stage.id,exercise,...d},null,2),'unfinished-return');const source=d.source,lag=d.lag;drafts.delete(key());const fresh=draft();fresh.source=source;fresh.lag=lag;renderFields();message('Unfinished return downloaded. The same current selection is ready to seed a new history; no earlier target has been substituted.');});
      const keep=q('[data-keep]');if(keep){keep.disabled=stale||!!old&&!d.revealed;keep.textContent=old?'Keep this return':'Keep this entry';}
      q('[data-fresh]').addEventListener('click',()=>{if(!isCurrent())return;if(['source','recollection','relation','revision'].some(field=>d[field].trim())&&!root.confirm('Begin a fresh stream and discard the unfinished note for this exercise? Saved observations stay in your record.'))return;drafts.delete(key());renderFields();message('A fresh observation stream is ready.');});
    }
    function saveObservation(event) {
      event.preventDefault();const d=draft(),old=target();
      if(!d.source.trim())return;
      if(staleReference()){message('This return’s exact earlier entry is absent from the loaded record. Download the unfinished return and begin a new history with your current selection.');q('[data-recover-return]').focus();return;}
      if(old&&!d.locked){message('Encode the current entry before deliberately retrieving the earlier one.');q('[data-lock-source]').focus();return;}
      if(old&&!d.revealed){message('Retrieve first, then reveal the preserved original before keeping your comparison. It is fine not to remember.');q('[data-reveal]').focus();return;}
      const data=store.data,id=uid();
      data.entries.push({id,stageId:stage.id,exercise,streamId:d.streamId,createdAt:new Date().toISOString(),source:d.source.trim(),recollection:d.recollection.trim(),referenceId:old?.id||null,referenceSource:old?.source||'',lag:d.lag,relation:d.relation.trim(),revision:d.revision.trim()});
      const result=save(data);
      if(store.data.entries.some(e=>e.id===id)){d.source='';d.recollection='';d.relation='';d.revision='';d.locked=false;d.reference=null;d.revealed=false;renderFields();renderRecord();if(result.ok)message('Entry kept. Its original wording and the earlier original are preserved.');}
    }
    function renderReadiness() {
      const el=q('[data-readiness]');if(!el)return;
      const ready=store.data.readiness[stage.id]||{},next=D.STAGES[D.STAGES.indexOf(stage)+1];
      const other=exerciseOrder[(exerciseOrder.indexOf(exercise)+1)%exerciseOrder.length];
      el.innerHTML=`<label class="training-check"><input type="checkbox" data-ready ${ready[exercise]?'checked':''}> I can recover the relationships and make an exact return.</label><p class="training-fine">Your self-assessment · ${exerciseNames[exercise]}</p><div class="training-ready-actions"><button type="button" class="text-button" data-other>Try ${exerciseNames[other]} →</button>${next?`<a class="text-link" href="#practice/${esc(next.id)}${routeMode()?'/'+routeMode():''}">${esc(next.name)} →</a>`:''}</div>`;
      q('[data-ready]').addEventListener('change',e=>{const data=store.data;data.readiness[stage.id]={stream:!!ready.stream,frequency:!!ready.frequency,heart:!!ready.heart,body:!!ready.body,unitive:!!ready.unitive,[exercise]:e.target.checked};save(data);renderReadiness();renderRecord();all('[data-exercise]').forEach(button=>{const name=button.dataset.exercise;button.querySelector('small').textContent=store.data.readiness[stage.id]?.[name]?'Self-assessed: ready':'';});q('[data-ready]').focus();});
      q('[data-other]').addEventListener('click',()=>{end();clock=null;exercise=other;onExerciseChange(routeMode());pacing=pacingByExercise[exercise];duration=15;peek=null;lastPrompt='';render();q('[data-exercise="'+exercise+'"]').focus();q('[data-live]').scrollIntoView({block:'start'});});
    }
    function renderRecord() {
      const data=store.data;q('[data-record-count]').textContent='· '+data.entries.length+' observation'+(data.entries.length===1?'':'s');
      q('[data-record]').innerHTML=`<p>${data.sessions.length} recorded practice period${data.sessions.length===1?'':'s'} · ${data.entries.length} private observation${data.entries.length===1?'':'s'}</p>${data.entries.slice().reverse().map(e=>`<details class="training-saved-entry"><summary>${esc(D.getStage(e.stageId).name)} · ${exerciseNames[e.exercise]} · ${esc(new Date(e.createdAt).toLocaleString())}</summary><h4>Original observation</h4><p>${esc(e.source)}</p>${e.referenceId?`<h4>Recollection before reveal</h4><p>${esc(e.recollection||'No recollection recorded.')}</p><h4>Original ${e.lag} observation${e.lag===1?'':'s'} back</h4><p>${esc(e.referenceSource)}</p>`:''}${e.relation?`<h4>My comparison</h4><p>${esc(e.relation)}</p>`:''}${e.revision?`<h4>Appended correction</h4><p>${esc(e.revision)}</p>`:''}</details>`).join('')}`;
    }
    function tick() {
      if(!q('[data-live]'))return;
      // Preview the first step without starting a clock, sound, or saved session.
      const idle=!clock;
      const s=clock?clock.tick():{status:'idle',remainingSeconds:duration*60,elapsedSeconds:0,progress:0,breathPhase:'inhale',breathProgress:0,breathRemaining:inhaleSeconds,breathPhaseIndex:0,heartPhaseIndex:0,bodyStepIndex:0,stepRemaining:E.BODY_STEP_SECONDS};
      const active=['running','paused'].includes(s.status),finished=!idle&&!active;
      // Keep the same live cue and its controls, moving it beside the shape only during a session.
      const symbolHeader=q('.training-symbol-header'),cue=q('.training-cue'),cueHome=q('[data-exercise-preview]');
      const cueTarget=symbolHeader;
      if(cue.parentElement!==cueTarget)cueTarget.appendChild(cue);
      cue.hidden=false;
      symbolHeader.classList.add('has-live-cue','has-signal-layout');
      q('[data-signal-explanation]').hidden=exercise!=='open'&&stage.id==='open-streaming'&&!(active&&exercise==='unitive');
      q('[data-pair-details]').hidden=exercise!=='open'&&stage.id==='open-streaming';
      symbolHeader.classList.toggle('has-heart-guidance',false);
      q('[data-heart-instructions]').hidden=true;
      q('[data-unitive-body]').hidden=true;
      q('[data-live]').hidden=false;
      q('[data-session-bar]').hidden=false;q('[data-timer]').hidden=idle;
      const orbButton=q('[data-start-orb]');orbButton.hidden=false;orbButton.textContent=active?'':'Start';orbButton.setAttribute('aria-label',s.status==='running'?'Pause practice':s.status==='paused'?'Resume practice':'Start practice');q('[data-start-toolbar]').hidden=active;
      q('[data-breath-readout]').hidden=!active;
      q('[data-duration-field]').hidden=active;
      q('[data-apply-rhythm]').hidden=!active;
      q('[data-rhythm-current]').hidden=!active;
      q('#rhythm-help').textContent=active?'Apply changes to begin a new inhale; the practice timer continues.':'Choose your rhythm, then Start.';
      q('[data-exercise-preview]').classList.toggle('training-preview-body',exercise==='body'&&pacing==='natural');
      q('.training-progress').hidden=!active;
      q('[data-session-state]').textContent=idle?'Ready':s.status==='running'?'Practising':s.status==='paused'?'Paused':s.status==='completed'?'Complete':'Ended';
      q('[data-timer]').textContent=time(s.remainingSeconds);
      q('[data-pause]').textContent=s.status==='paused'?'Resume':'Pause';q('[data-pause]').hidden=!active;q('[data-end]').hidden=!active;
      q('[data-finished]').hidden=!finished;q('[data-finished]').textContent=s.status==='completed'?'Practice complete.':'Practice ended.';
      q('[data-live-pace]').hidden=!active||exercise==='body'||isTransmutation();q('[data-live-pace]').textContent=pacing==='natural'?'Use my '+inhaleSeconds+' / '+exhaleSeconds+' guide':'Use my own rhythm';
      // Switching shapes ends and records the old period in setStage(), just
      // like choosing another card in the always-visible shape grid.
      q('[data-shape]').disabled=false;all('[data-exercise], [data-frequency-module]').forEach(el=>el.disabled=active);
      if (exercise === 'unitive') {
        all('[data-loci-tab]').forEach(tab => {tab.disabled=active || Number(tab.dataset.lociTab)>unlockedLoci;});
        const proceed=q('[data-loci-continue]');
        if (proceed) proceed.disabled=active;
      }
      const scaled=pacing==='paced'&&active;
      const progress=s.breathProgress;
      // Keep the label still and enclosed even at the smallest point. Own rhythm
      // has a gentle visual pulse; only paced mode gives timed breathing cues.
      const expansion=scaled?(s.breathPhase==='inhale'?progress:1-progress):(1-Math.cos(s.elapsedSeconds*Math.PI/6))/2;
      q('[data-orb]').style.transform=active?'scale('+(1+0.18*expansion)+')':'scale(1)';
      q('[data-pacer]').hidden=false;
      q('[data-breath-label]').textContent=idle?(pacing==='paced'?'Ready':'Own rhythm'):finished?'Rest':s.status==='paused'?'Paused':pacing==='paced'?(s.breathPhase==='inhale'?'Inhale':'Exhale'):'Own rhythm';
      const remaining=Math.ceil(s.breathRemaining*10-1e-8)/10;
      q('[data-breath-count]').textContent=idle?(pacing==='paced'?inhaleSeconds+'s in · '+exhaleSeconds+'s out':'Gently · without holds'):scaled?(s.status==='paused'?(s.breathPhase==='inhale'?'Inhale · ':'Exhale · '):'')+remaining+' second'+(remaining===1?'':'s'):'Gently · without holds';
      updateAgencyPractice(s);
      if(s.bodyStepIndex!==lastBodyStep){lastBodyStep=s.bodyStepIndex;}
      if(exercise==='body'&&active)signalFocus=(signalCycleBase+(s.breathCycleIndex||0))%signalLimit();
      const firstLociEntry=exercise==='unitive'&&(idle||(active&&s.breathPhaseIndex<2));
      const promptKey=s.status+':'+exercise+':'+stage.id+':'+lociStep+':'+frequencyModule+':'+signalFocus+':'+shapeFocus+':'+[...signalSelection].sort().join(',')+':'+(pacing==='paced'?s.breathPhase:'natural')+':'+(firstLociEntry?'first':'later');
      if(promptKey!==lastPrompt){
        lastPrompt=promptKey;
        const story=FEELING_AND_STORY[stage.id];
        const phase=pacing==='paced'?s.breathPhase:'natural';
        if(exercise!=='open'&&exercise!=='body'&&!isTransmutation()&&stage.id!=='open-streaming'){
          const items=modePairings(),item=items[Math.min(shapeFocus,items.length-1)];
          q('[data-signal-pair]').textContent=stage.name+' · '+item.pair;
          if(exercise!=='stream'){
            const lesson=story.freq;
            if(exercise==='unitive'){
              const lesson=currentLociLesson();
              q('[data-signal-pair]').textContent=stage.name+' · '+lociScale(stage);
              const showPlacement = firstLociEntry && (active || !previewLociCue);
              q('[data-signal-pairing]').textContent=showPlacement ? LOCI_COURSE[lociStep].firstExample : item.cue;
              q('[data-signal-example]').textContent=showPlacement ? '' : lesson.check;
            }else{
              q('[data-signal-pairing]').textContent=exercise==='heart' ? (HEART_SHAPES[stage.id]||HEART_SHAPES.circle).practice : lesson.example;
              q('[data-signal-example]').textContent=exercise==='heart' ? (HEART_SHAPES[stage.id]||HEART_SHAPES.circle).reflection : lesson.check;
            }
          }
          if(exercise==='stream'){
            const examples=waveRelationshipText();
            const selectedLabel=item.pair+(item.group?' in the park map. ':' in the example. ');
            if(q('[data-wave-selected]').textContent!==selectedLabel)q('[data-wave-selected]').textContent=selectedLabel;
            q('[data-signal-pair]').textContent='';
            const selectedText=item.group?'<ol start="'+(shapeFocus*10+1)+'">'+examples.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol>':esc(examples[0]);
            if(q('[data-signal-pairing]').innerHTML!==selectedText)q('[data-signal-pairing]').innerHTML=selectedText;
            q('[data-signal-example]').textContent=item.group?'Explore a group of paths in the park map.':'';
          }
          all('[data-signal-vector]').forEach(el=>{const focus=Number(el.dataset.signalVector)===shapeFocus;el.hidden=firstLociEntry && active && stage.id!=='circle';el.setAttribute('aria-pressed',String(focus));el.classList.toggle('is-current',focus);});
        }
        if(exercise==='open'){
          q('[data-step-label]').textContent='Synchronised Psiduction';
          q('[data-dimension]').hidden=true;
          q('[data-prompt]').textContent='Let images, thoughts, sensations, feelings or meanings arise as they are. Follow what unfolds and respond naturally.';
          q('[data-next-step]').textContent='There is no shape to follow or particular experience to achieve.';
        }else if(exercise==='frequency'){
          q('[data-step-label]').textContent=exerciseNames.frequency;
          q('[data-dimension]').hidden=true;
          if (!isTransmutation()) {
            q('[data-prompt]').textContent=story?story.freq.why:'Imagine walking into the playground. How does it feel to be there?';
            q('[data-next-step]').textContent='You can name just the feelings you notice. It’s okay to say “I’m not sure.”';
          }
        }else if(exercise==='heart'){
          const heart=HEART_SHAPES[stage.id]||HEART_SHAPES.circle;
          q('[data-step-label]').textContent='Heart Activation · '+stage.name;
          q('[data-dimension]').hidden=false;q('[data-dimension]').textContent=heart.name;
          q('[data-prompt]').textContent=heart.prompt;
          q('[data-next-step]').textContent='';
        }else if(exercise==='body'){
          const item=E.BODY_STEPS[signalFocus],pairedShape=D.STAGES[signalFocus],anchor=signalAnchor();
          q('[data-step-label]').textContent='Signal Psiduction · '+stage.name;
          q('[data-dimension]').hidden=false;q('[data-dimension]').textContent=anchor?item.label:'Open awareness';
          q('[data-prompt]').textContent=anchor?'Choose one question to explore on this breath.':'What can you feel where your feet touch the floor?';
          const questions=q('[data-signal-questions]');questions.hidden=!anchor;const questionHTML=anchor?item.questions.map(question=>'<li>'+esc(question)+'</li>').join(''):'';if(questions.innerHTML!==questionHTML)questions.innerHTML=questionHTML;
          q('[data-next-step]').textContent=active?'Notice how this vector relates to the others in the shape.':anchor&&signalLimit()>1?'Explore a word on the shape, then start to cycle through the vectors in order.':'';
          q('[data-signal-pair]').textContent=pairedShape.name+' · '+item.label;
          q('[data-signal-pairing]').textContent=item.pairing;
          q('[data-signal-example]').textContent=item.example;
          all('[data-signal-vector]').forEach(el=>{const focused=Number(el.dataset.signalVector)===signalFocus;el.setAttribute('aria-pressed',String(focused));el.classList.toggle('is-current',focused);});
        }else if(stage.id==='open-streaming'){
          q('[data-step-label]').textContent=exerciseNames[exercise]+' · Open Streaming';
          q('[data-dimension]').hidden=true;
          q('[data-prompt]').textContent=exercise==='unitive'?'Choose a remembered place and a route through it. Give each experience that arises a distinct location along the route.':'A picture, a word or a sound might pop into your mind. What comes next?';
          q('[data-next-step]').textContent=exercise==='unitive'?'Return to an earlier location, retrieve what you placed there, and connect it with the present experience. If it is your first entry, begin by placing it.':' ';
        }else if(exercise==='stream'){
          q('[data-step-label]').textContent='Wave Psiduction · '+stage.name;
          const pairing=WAVE[stage.id];
          q('[data-dimension]').hidden=false;
          q('[data-dimension]').textContent=pairing.name;
          q('[data-prompt]').textContent=pairing.why;
          q('[data-next-step]').textContent=active?(phase==='exhale'?pairing.check:'Take an easy breath. Picture the example, or try one of your own.') : '';
        }else{
          const step=LOCI_COURSE[lociStep];
          const lesson=currentLociLesson();
          q('[data-step-label]').textContent=step.title+' · '+stage.name;
          q('[data-dimension]').hidden=false;
          q('[data-dimension]').textContent=lesson.name;
          q('[data-prompt]').textContent=firstLociEntry ? step.first : lesson.prompt;
          q('[data-next-step]').textContent=firstLociEntry || stage.id==='circle' ? '' : 'Choose one cue on the shape to practise on this visit.';
        }
        if(finished){
          q('[data-signal-questions]').hidden=true;
          q('[data-prompt]').textContent=stage.id==='open-streaming'||exercise!=='unitive'?'Rest in your own rhythm.':'Keep your last entry. Rest in your own rhythm.';
          q('[data-step-label]').textContent='';
          q('[data-dimension]').hidden=true;
          q('[data-next-step]').textContent='';
        }
      }
      const bodyCue=false;
      const cueKey=bodyCue?'body:'+Math.floor(s.elapsedSeconds/E.BODY_STEP_SECONDS):'breath:'+s.breathPhaseIndex;
      if(s.status==='running'&&cueKey!==lastCue){lastCue=cueKey;if(bell&&(bodyCue||pacing==='paced'))audio.cue(bodyCue?s.bodyStepIndex%2===0:s.breathPhase==='inhale', !bodyCue);}
      const percent=Math.round(s.progress*100);q('[data-fill]').style.width=percent+'%';q('.training-progress').setAttribute('aria-valuenow',String(percent));
    }
    function setStage(id) {
      const next=resolveStage(id);if(next.id===stage.id)return;
      end();clock=null;stage=next;
      lociExampleIndex=Math.max(0,D.STAGES.findIndex(item=>item.id===stage.id));
      resetSignalSelection();peek=null;lastPrompt='';announcement='';render();
    }
    function storageChanged(event){if(event.key===root.FormTrainingStore.STORAGE_KEY||event.key===null){pause();save(store.data);renderStorage();message('Another tab changed the saved record. Your existing data is preserved; practice can continue without saving.');}}
    if (exercise === 'unitive' && initialExercise !== routeMode()) onExerciseChange(routeMode());
    render();const interval=setInterval(tick,50);root.addEventListener('storage',storageChanged);
    return {setStage,pause,showRoute,routeMode,showWave(){if(exercise!=='stream')q('[data-exercise="stream"]').click();},showOpen(){if(exercise!=='open')q('[data-exercise="open"]').click();},hasDraft:()=>dirty()||unsaved,destroy(){pause();if(agencyMap)agencyMap.destroy();clearInterval(interval);audio.destroy();testAudio.destroy();root.removeEventListener('storage',storageChanged);}};
  }
  root.FormTraining = Object.freeze({mount});
})(typeof window !== 'undefined' ? window : globalThis);


