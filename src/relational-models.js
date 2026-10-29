(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FormRelationalModels = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Manual edition 2.2: one explicit relation at Circle; complete return at every
  // form. Graphs are declared teaching constructions, never psychometric ranks.
  const DATA = {
  "stages": [
    {
      "id": "circle",
      "name": "Circle",
      "count": 1
    },
    {
      "id": "half-circle",
      "name": "Half-circle",
      "count": 2
    },
    {
      "id": "triangle",
      "name": "Triangle",
      "count": 3
    },
    {
      "id": "square",
      "name": "Square",
      "count": 4
    },
    {
      "id": "pentagon",
      "name": "Pentagon",
      "count": 5
    },
    {
      "id": "hexagon",
      "name": "Hexagon",
      "count": 6
    },
    {
      "id": "heptagon",
      "name": "Heptagon",
      "count": 7
    },
    {
      "id": "octagon",
      "name": "Octagon",
      "count": 8
    },
    {
      "id": "prism",
      "name": "Triangular prism",
      "count": 9
    },
    {
      "id": "cube",
      "name": "Cube",
      "count": 12
    },
    {
      "id": "dodecahedron",
      "name": "Dodecahedron",
      "count": 30
    },
    {
      "id": "icosahedron",
      "name": "Icosahedron",
      "count": 30
    },
    {
      "id": "geodesic",
      "name": "Geodesic sphere",
      "count": 120
    },
    {
      "id": "sphere",
      "name": "Sphere",
      "count": 120
    }
  ],
  "low": {
    "stream": {
      "circle": {
        "nodes": [
          {
            "id": "n1",
            "label": "Ocean"
          },
          {
            "id": "n2",
            "label": "Boat"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Ocean is the containing environment of boat."
          }
        ]
      },
      "half-circle": {
        "nodes": [
          {
            "id": "n1",
            "label": "Ocean"
          },
          {
            "id": "n2",
            "label": "Boat"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Ocean is the containing environment of boat."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n1",
            "text": "Boat provides a means of traversing ocean."
          }
        ]
      },
      "triangle": {
        "nodes": [
          {
            "id": "n1",
            "label": "Ocean"
          },
          {
            "id": "n2",
            "label": "Boat"
          },
          {
            "id": "n3",
            "label": "Fisher"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Ocean contains boat."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Boat enables fisher."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n1",
            "text": "Fisher depends on ocean."
          }
        ]
      },
      "square": {
        "nodes": [
          {
            "id": "n1",
            "label": "Ocean"
          },
          {
            "id": "n2",
            "label": "Boat"
          },
          {
            "id": "n3",
            "label": "Fisher"
          },
          {
            "id": "n4",
            "label": "Village"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Ocean contains boat."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Boat enables fisher."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Fisher supplies village."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n1",
            "text": "Village depends on ocean."
          }
        ]
      },
      "pentagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Ocean"
          },
          {
            "id": "n2",
            "label": "Boat"
          },
          {
            "id": "n3",
            "label": "Fisher"
          },
          {
            "id": "n4",
            "label": "Catch"
          },
          {
            "id": "n5",
            "label": "Village"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Ocean contains boat."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Boat enables fisher."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Fisher harvests catch."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Catch nourishes village."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n1",
            "text": "Village depends on ocean."
          }
        ]
      },
      "hexagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Ocean"
          },
          {
            "id": "n2",
            "label": "Boat"
          },
          {
            "id": "n3",
            "label": "Fisher"
          },
          {
            "id": "n4",
            "label": "Catch"
          },
          {
            "id": "n5",
            "label": "Village"
          },
          {
            "id": "n6",
            "label": "Quota"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Ocean contains boat."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Boat enables fisher."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Fisher harvests catch."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Catch nourishes village."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Village sets quota."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n1",
            "text": "Quota constrains extraction from ocean."
          }
        ]
      },
      "heptagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Ocean"
          },
          {
            "id": "n2",
            "label": "Boat"
          },
          {
            "id": "n3",
            "label": "Fisher"
          },
          {
            "id": "n4",
            "label": "Catch"
          },
          {
            "id": "n5",
            "label": "Village"
          },
          {
            "id": "n6",
            "label": "Council"
          },
          {
            "id": "n7",
            "label": "Quota"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Ocean contains boat."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Boat enables fisher."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Fisher harvests catch."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Catch nourishes village."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Village authorises council."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n7",
            "text": "Council sets quota."
          },
          {
            "id": "R07",
            "from": "n7",
            "to": "n1",
            "text": "Quota constrains extraction from ocean."
          }
        ]
      },
      "octagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Ocean"
          },
          {
            "id": "n2",
            "label": "Boat"
          },
          {
            "id": "n3",
            "label": "Fisher"
          },
          {
            "id": "n4",
            "label": "Catch"
          },
          {
            "id": "n5",
            "label": "Village"
          },
          {
            "id": "n6",
            "label": "Council"
          },
          {
            "id": "n7",
            "label": "Quota"
          },
          {
            "id": "n8",
            "label": "Stock estimate"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Ocean contains boat."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Boat enables fisher."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Fisher harvests catch."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Catch nourishes village."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Village authorises council."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n7",
            "text": "Council sets quota."
          },
          {
            "id": "R07",
            "from": "n7",
            "to": "n8",
            "text": "Quota accords with stock estimate."
          },
          {
            "id": "R08",
            "from": "n8",
            "to": "n1",
            "text": "Stock estimate represents the ocean stock."
          }
        ]
      },
      "prism": {
        "nodes": [
          {
            "id": "n1",
            "label": "Ocean"
          },
          {
            "id": "n2",
            "label": "Boat"
          },
          {
            "id": "n3",
            "label": "Fisher"
          },
          {
            "id": "n4",
            "label": "Forest"
          },
          {
            "id": "n5",
            "label": "Path"
          },
          {
            "id": "n6",
            "label": "Walker"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Ocean contains boat."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Boat enables fisher."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n1",
            "text": "Fisher depends on ocean."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Forest contains path."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Path enables walker."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n4",
            "text": "Walker depends on forest."
          },
          {
            "id": "R07",
            "from": "n1",
            "to": "n4",
            "text": "Ocean and forest correspond as sustaining environments.",
            "kind": "selected analogy"
          },
          {
            "id": "R08",
            "from": "n2",
            "to": "n5",
            "text": "Boat and path correspond as means of access.",
            "kind": "selected analogy"
          },
          {
            "id": "R09",
            "from": "n3",
            "to": "n6",
            "text": "Fisher and walker correspond as agents depending on their environments.",
            "kind": "selected analogy"
          }
        ]
      },
      "cube": {
        "nodes": [
          {
            "id": "n1",
            "label": "Ocean"
          },
          {
            "id": "n2",
            "label": "Boat"
          },
          {
            "id": "n3",
            "label": "Fisher"
          },
          {
            "id": "n4",
            "label": "Village"
          },
          {
            "id": "n5",
            "label": "Land"
          },
          {
            "id": "n6",
            "label": "Irrigation"
          },
          {
            "id": "n7",
            "label": "Grower"
          },
          {
            "id": "n8",
            "label": "Town"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Ocean contains boat."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Boat enables fisher."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Fisher supplies village."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n1",
            "text": "Village depends on ocean."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Land contains irrigation."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n7",
            "text": "Irrigation enables grower."
          },
          {
            "id": "R07",
            "from": "n7",
            "to": "n8",
            "text": "Grower supplies town."
          },
          {
            "id": "R08",
            "from": "n8",
            "to": "n5",
            "text": "Town depends on land."
          },
          {
            "id": "R09",
            "from": "n1",
            "to": "n5",
            "text": "Ocean and land correspond as resource environments.",
            "kind": "selected analogy"
          },
          {
            "id": "R10",
            "from": "n2",
            "to": "n6",
            "text": "Boat and irrigation correspond as infrastructure enabling work.",
            "kind": "selected analogy"
          },
          {
            "id": "R11",
            "from": "n3",
            "to": "n7",
            "text": "Fisher and grower correspond as producers.",
            "kind": "selected analogy"
          },
          {
            "id": "R12",
            "from": "n4",
            "to": "n8",
            "text": "Village and town correspond as communities relying on production.",
            "kind": "selected analogy"
          }
        ]
      }
    },
    "heart": {
      "circle": {
        "nodes": [
          {
            "id": "n1",
            "label": "Memory"
          },
          {
            "id": "n2",
            "label": "Appreciation"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Remembered kindness supports appreciation."
          }
        ]
      },
      "half-circle": {
        "nodes": [
          {
            "id": "n1",
            "label": "Memory"
          },
          {
            "id": "n2",
            "label": "Appreciation"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Remembered kindness supports appreciation."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n1",
            "text": "Appreciation gives the memory personal significance."
          }
        ]
      },
      "triangle": {
        "nodes": [
          {
            "id": "n1",
            "label": "Memory"
          },
          {
            "id": "n2",
            "label": "Appreciation"
          },
          {
            "id": "n3",
            "label": "Friend"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Remembered kindness supports appreciation."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Appreciation values friend."
          },
          {
            "id": "R03",
            "from": "n1",
            "to": "n3",
            "text": "Memory represents the friend’s kindness."
          }
        ]
      },
      "square": {
        "nodes": [
          {
            "id": "n1",
            "label": "Memory"
          },
          {
            "id": "n2",
            "label": "Appreciation"
          },
          {
            "id": "n3",
            "label": "Care"
          },
          {
            "id": "n4",
            "label": "Friend"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Remembered kindness supports appreciation."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Appreciation expresses care."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Care values friend."
          },
          {
            "id": "R04",
            "from": "n1",
            "to": "n4",
            "text": "Memory represents the friend’s kindness."
          }
        ]
      },
      "pentagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Memory"
          },
          {
            "id": "n2",
            "label": "Appreciation"
          },
          {
            "id": "n3",
            "label": "Care"
          },
          {
            "id": "n4",
            "label": "Wish"
          },
          {
            "id": "n5",
            "label": "Friend"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Remembered kindness supports appreciation."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Appreciation expresses care."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Care motivates a wish."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Wish concerns the friend’s wellbeing."
          },
          {
            "id": "R05",
            "from": "n1",
            "to": "n5",
            "text": "Memory represents the friend’s kindness."
          }
        ]
      },
      "hexagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Memory"
          },
          {
            "id": "n2",
            "label": "Appreciation"
          },
          {
            "id": "n3",
            "label": "Care"
          },
          {
            "id": "n4",
            "label": "Wish"
          },
          {
            "id": "n5",
            "label": "Friend"
          },
          {
            "id": "n6",
            "label": "Context"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Remembered kindness supports appreciation."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Appreciation expresses care."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Care motivates a wish."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Wish concerns the friend’s wellbeing."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Friend belongs to remembered context."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n1",
            "text": "Context gives memory meaning."
          }
        ]
      },
      "heptagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Memory"
          },
          {
            "id": "n2",
            "label": "Appreciation"
          },
          {
            "id": "n3",
            "label": "Care"
          },
          {
            "id": "n4",
            "label": "Wish"
          },
          {
            "id": "n5",
            "label": "Friend"
          },
          {
            "id": "n6",
            "label": "Context"
          },
          {
            "id": "n7",
            "label": "Interpretation"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Remembered kindness supports appreciation."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Appreciation expresses care."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Care motivates a wish."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Wish concerns the friend’s wellbeing."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Friend belongs to remembered context."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n7",
            "text": "Context informs interpretation."
          },
          {
            "id": "R07",
            "from": "n7",
            "to": "n1",
            "text": "Interpretation frames memory."
          }
        ]
      },
      "octagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Memory"
          },
          {
            "id": "n2",
            "label": "Appreciation"
          },
          {
            "id": "n3",
            "label": "Care"
          },
          {
            "id": "n4",
            "label": "Wish"
          },
          {
            "id": "n5",
            "label": "Friend"
          },
          {
            "id": "n6",
            "label": "Context"
          },
          {
            "id": "n7",
            "label": "Interpretation"
          },
          {
            "id": "n8",
            "label": "Uncertainty"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Remembered kindness supports appreciation."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Appreciation expresses care."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Care motivates a wish."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Wish concerns the friend’s wellbeing."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Friend belongs to remembered context."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n7",
            "text": "Context informs interpretation."
          },
          {
            "id": "R07",
            "from": "n7",
            "to": "n8",
            "text": "Interpretation acknowledges uncertainty."
          },
          {
            "id": "R08",
            "from": "n8",
            "to": "n1",
            "text": "Uncertainty limits claims about memory."
          }
        ]
      },
      "prism": {
        "nodes": [
          {
            "id": "n1",
            "label": "Memory"
          },
          {
            "id": "n2",
            "label": "Appreciation"
          },
          {
            "id": "n3",
            "label": "Friend"
          },
          {
            "id": "n4",
            "label": "Pet memory"
          },
          {
            "id": "n5",
            "label": "Fondness"
          },
          {
            "id": "n6",
            "label": "Pet"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Remembered kindness supports appreciation."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Appreciation values friend."
          },
          {
            "id": "R03",
            "from": "n1",
            "to": "n3",
            "text": "Memory represents the friend’s kindness."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Pet memory supports fondness."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Fondness values pet."
          },
          {
            "id": "R06",
            "from": "n4",
            "to": "n6",
            "text": "Pet memory represents pet."
          },
          {
            "id": "R07",
            "from": "n1",
            "to": "n4",
            "text": "Memory and pet memory correspond as representations of valued relationships.",
            "kind": "selected analogy"
          },
          {
            "id": "R08",
            "from": "n2",
            "to": "n5",
            "text": "Appreciation and fondness correspond as feelings of valuing.",
            "kind": "selected analogy"
          },
          {
            "id": "R09",
            "from": "n3",
            "to": "n6",
            "text": "Friend and pet correspond as recipients of care.",
            "kind": "selected analogy"
          }
        ]
      },
      "cube": {
        "nodes": [
          {
            "id": "n1",
            "label": "Memory"
          },
          {
            "id": "n2",
            "label": "Appreciation"
          },
          {
            "id": "n3",
            "label": "Care"
          },
          {
            "id": "n4",
            "label": "Friend"
          },
          {
            "id": "n5",
            "label": "Pet memory"
          },
          {
            "id": "n6",
            "label": "Fondness"
          },
          {
            "id": "n7",
            "label": "Animal care"
          },
          {
            "id": "n8",
            "label": "Pet"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Remembered kindness supports appreciation."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Appreciation expresses care."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Care values friend."
          },
          {
            "id": "R04",
            "from": "n1",
            "to": "n4",
            "text": "Memory represents the friend’s kindness."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Pet memory supports fondness."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n7",
            "text": "Fondness expresses animal care."
          },
          {
            "id": "R07",
            "from": "n7",
            "to": "n8",
            "text": "Animal care values pet."
          },
          {
            "id": "R08",
            "from": "n5",
            "to": "n8",
            "text": "Pet memory represents pet."
          },
          {
            "id": "R09",
            "from": "n1",
            "to": "n5",
            "text": "Memory and pet memory correspond as representations of valued relationships.",
            "kind": "selected analogy"
          },
          {
            "id": "R10",
            "from": "n2",
            "to": "n6",
            "text": "Appreciation and fondness correspond as feelings of valuing.",
            "kind": "selected analogy"
          },
          {
            "id": "R11",
            "from": "n3",
            "to": "n7",
            "text": "Care and animal care correspond as concern for another’s wellbeing.",
            "kind": "selected analogy"
          },
          {
            "id": "R12",
            "from": "n4",
            "to": "n8",
            "text": "Friend and pet correspond as recipients of care.",
            "kind": "selected analogy"
          }
        ]
      }
    },
    "body": {
      "circle": {
        "nodes": [
          {
            "id": "n1",
            "label": "Chair"
          },
          {
            "id": "n2",
            "label": "Torso"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Chair supports torso as experienced."
          }
        ]
      },
      "half-circle": {
        "nodes": [
          {
            "id": "n1",
            "label": "Chair"
          },
          {
            "id": "n2",
            "label": "Torso"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Chair supports torso as experienced."
          },
          {
            "id": "R02",
            "from": "n1",
            "to": "n2",
            "text": "Chair restricts the torso’s available movement."
          }
        ]
      },
      "triangle": {
        "nodes": [
          {
            "id": "n1",
            "label": "Chair"
          },
          {
            "id": "n2",
            "label": "Torso"
          },
          {
            "id": "n3",
            "label": "Pressure"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Chair supports torso as experienced."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Torso contains felt pressure."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n1",
            "text": "Pressure registers contact with chair."
          }
        ]
      },
      "square": {
        "nodes": [
          {
            "id": "n1",
            "label": "Chair"
          },
          {
            "id": "n2",
            "label": "Torso"
          },
          {
            "id": "n3",
            "label": "Pressure"
          },
          {
            "id": "n4",
            "label": "Support judgment"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Chair supports torso as experienced."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Torso contains felt pressure."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Pressure informs support judgment."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n1",
            "text": "Support judgment concerns chair."
          }
        ]
      },
      "pentagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Chair"
          },
          {
            "id": "n2",
            "label": "Torso"
          },
          {
            "id": "n3",
            "label": "Pressure"
          },
          {
            "id": "n4",
            "label": "Description"
          },
          {
            "id": "n5",
            "label": "Support judgment"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Chair supports torso as experienced."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Torso contains felt pressure."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Pressure informs description."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Description supports support judgment."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n1",
            "text": "Support judgment concerns chair."
          }
        ]
      },
      "hexagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Chair"
          },
          {
            "id": "n2",
            "label": "Torso"
          },
          {
            "id": "n3",
            "label": "Pressure"
          },
          {
            "id": "n4",
            "label": "Description"
          },
          {
            "id": "n5",
            "label": "Support judgment"
          },
          {
            "id": "n6",
            "label": "Context"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Chair supports torso as experienced."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Torso contains felt pressure."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Pressure informs description."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Description supports support judgment."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Support judgment is interpreted within context."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n1",
            "text": "Context includes chair as support."
          }
        ]
      },
      "heptagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Chair"
          },
          {
            "id": "n2",
            "label": "Torso"
          },
          {
            "id": "n3",
            "label": "Pressure"
          },
          {
            "id": "n4",
            "label": "Description"
          },
          {
            "id": "n5",
            "label": "Support judgment"
          },
          {
            "id": "n6",
            "label": "Expectation"
          },
          {
            "id": "n7",
            "label": "Context"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Chair supports torso as experienced."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Torso contains felt pressure."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Pressure informs description."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Description supports support judgment."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Support judgment is compared with expected support."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n7",
            "text": "Expectation is shaped by context."
          },
          {
            "id": "R07",
            "from": "n7",
            "to": "n1",
            "text": "Context includes chair as support."
          }
        ]
      },
      "octagon": {
        "nodes": [
          {
            "id": "n1",
            "label": "Chair"
          },
          {
            "id": "n2",
            "label": "Torso"
          },
          {
            "id": "n3",
            "label": "Pressure"
          },
          {
            "id": "n4",
            "label": "Attention"
          },
          {
            "id": "n5",
            "label": "Description"
          },
          {
            "id": "n6",
            "label": "Support judgment"
          },
          {
            "id": "n7",
            "label": "Expectation"
          },
          {
            "id": "n8",
            "label": "Context"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Chair supports torso as experienced."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Torso contains felt pressure."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Pressure draws attention."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Attention selects description."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Description informs support judgment."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n7",
            "text": "Support judgment is compared with expected support."
          },
          {
            "id": "R07",
            "from": "n7",
            "to": "n8",
            "text": "Expectation is shaped by context."
          },
          {
            "id": "R08",
            "from": "n8",
            "to": "n1",
            "text": "Context includes chair as support."
          }
        ]
      },
      "prism": {
        "nodes": [
          {
            "id": "n1",
            "label": "Chair"
          },
          {
            "id": "n2",
            "label": "Torso"
          },
          {
            "id": "n3",
            "label": "Pressure"
          },
          {
            "id": "n4",
            "label": "Floor"
          },
          {
            "id": "n5",
            "label": "Feet"
          },
          {
            "id": "n6",
            "label": "Sole sensation"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Chair supports torso as experienced."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Torso contains felt pressure."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n1",
            "text": "Pressure registers contact with chair."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n5",
            "text": "Floor supports feet as experienced."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Feet contain sole sensation."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n4",
            "text": "Sole sensation registers contact with floor."
          },
          {
            "id": "R07",
            "from": "n1",
            "to": "n4",
            "text": "Chair and floor correspond as supporting surfaces.",
            "kind": "selected analogy"
          },
          {
            "id": "R08",
            "from": "n2",
            "to": "n5",
            "text": "Torso and feet correspond as supported regions.",
            "kind": "selected analogy"
          },
          {
            "id": "R09",
            "from": "n3",
            "to": "n6",
            "text": "Pressure and sole sensation correspond as experienced contact signals.",
            "kind": "selected analogy"
          }
        ]
      },
      "cube": {
        "nodes": [
          {
            "id": "n1",
            "label": "Chair"
          },
          {
            "id": "n2",
            "label": "Torso"
          },
          {
            "id": "n3",
            "label": "Pressure"
          },
          {
            "id": "n4",
            "label": "Support judgment"
          },
          {
            "id": "n5",
            "label": "Floor"
          },
          {
            "id": "n6",
            "label": "Feet"
          },
          {
            "id": "n7",
            "label": "Sole sensation"
          },
          {
            "id": "n8",
            "label": "Footing judgment"
          }
        ],
        "relations": [
          {
            "id": "R01",
            "from": "n1",
            "to": "n2",
            "text": "Chair supports torso as experienced."
          },
          {
            "id": "R02",
            "from": "n2",
            "to": "n3",
            "text": "Torso contains felt pressure."
          },
          {
            "id": "R03",
            "from": "n3",
            "to": "n4",
            "text": "Pressure informs support judgment."
          },
          {
            "id": "R04",
            "from": "n4",
            "to": "n1",
            "text": "Support judgment concerns chair."
          },
          {
            "id": "R05",
            "from": "n5",
            "to": "n6",
            "text": "Floor supports feet as experienced."
          },
          {
            "id": "R06",
            "from": "n6",
            "to": "n7",
            "text": "Feet contain sole sensation."
          },
          {
            "id": "R07",
            "from": "n7",
            "to": "n8",
            "text": "Sole sensation informs footing judgment."
          },
          {
            "id": "R08",
            "from": "n8",
            "to": "n5",
            "text": "Footing judgment concerns floor."
          },
          {
            "id": "R09",
            "from": "n1",
            "to": "n5",
            "text": "Chair and floor correspond as supporting surfaces.",
            "kind": "selected analogy"
          },
          {
            "id": "R10",
            "from": "n2",
            "to": "n6",
            "text": "Torso and feet correspond as supported regions.",
            "kind": "selected analogy"
          },
          {
            "id": "R11",
            "from": "n3",
            "to": "n7",
            "text": "Pressure and sole sensation correspond as experienced contact signals.",
            "kind": "selected analogy"
          },
          {
            "id": "R12",
            "from": "n4",
            "to": "n8",
            "text": "Support judgment and footing judgment correspond as interpretations of support.",
            "kind": "selected analogy"
          }
        ]
      }
    }
  },
  "lowStates": {
    "stream": {
      "circle": [
        {
          "changes": [],
          "nodes": [],
          "inhale": "Ocean is the containing environment of boat.",
          "compare": "Seed history; no previous entry."
        },
        {
          "changes": [
            {
              "relationId": "R01",
              "text": "Boat provides a means of traversing ocean.",
              "from": "n2",
              "to": "n1"
            }
          ],
          "nodes": [],
          "inhale": "Boat provides a means of traversing ocean.",
          "compare": "Retrieve b1: same participants; the selected meaning changes from containment to traversal function."
        },
        {
          "changes": [
            {
              "relationId": "R01",
              "text": "Ocean constrains boat within these imagined conditions.",
              "from": "n1",
              "to": "n2"
            }
          ],
          "nodes": [],
          "inhale": "Ocean constrains boat within these imagined conditions.",
          "compare": "Retrieve b2: same participants; the selected meaning changes from traversal function to environmental constraint."
        },
        {
          "changes": [
            {
              "relationId": "R01",
              "text": "Ocean is the containing environment of boat.",
              "from": "n1",
              "to": "n2"
            }
          ],
          "nodes": [],
          "inhale": "Ocean is the containing environment of boat again.",
          "compare": "Retrieve b3: constraint becomes containment in the selection. Do not substitute the matching b1 record for the scheduled b3 return."
        }
      ],
      "half-circle": [
        {
          "changes": [],
          "nodes": [],
          "inhale": "Ocean is the containing environment of boat; boat is a means of traversing ocean.",
          "compare": "Seed history with both meanings."
        },
        {
          "changes": [
            {
              "relationId": "R01",
              "text": "Sky is the containing environment of aircraft."
            },
            {
              "relationId": "R02",
              "text": "Aircraft provides a means of traversing sky."
            }
          ],
          "nodes": [
            {
              "id": "n1",
              "label": "Sky"
            },
            {
              "id": "n2",
              "label": "Aircraft"
            }
          ],
          "inhale": "Sky is the containing environment of aircraft; aircraft is a means of traversing sky.",
          "compare": "Retrieve b1: environment corresponds to environment and means of travel to means of travel."
        },
        {
          "changes": [
            {
              "relationId": "R01",
              "text": "Harbour contains boat."
            },
            {
              "relationId": "R02",
              "text": "Harbour shelters boat.",
              "from": "n1",
              "to": "n2"
            }
          ],
          "nodes": [
            {
              "id": "n1",
              "label": "Harbour"
            },
            {
              "id": "n2",
              "label": "Boat"
            }
          ],
          "inhale": "Harbour contains boat; harbour shelters boat.",
          "compare": "Retrieve b2: containment persists. Function changes from traversal to shelter, and the containing role now supplies it."
        },
        {
          "changes": [
            {
              "relationId": "R01",
              "text": "Cage contains bird."
            },
            {
              "relationId": "R02",
              "text": "Cage restricts bird."
            }
          ],
          "nodes": [
            {
              "id": "n1",
              "label": "Cage"
            },
            {
              "id": "n2",
              "label": "Bird"
            }
          ],
          "inhale": "Cage contains bird; cage restricts bird.",
          "compare": "Retrieve b3: containment persists; the containing role now restricts rather than shelters the contained role."
        }
      ],
      "triangle": [
        {
          "changes": [],
          "nodes": [],
          "inhale": "Select the complete three-link baseline.",
          "compare": "Seed all three relations."
        },
        {
          "changes": [
            {
              "relationId": "R01",
              "text": "Ocean threatens boat."
            },
            {
              "relationId": "R02",
              "text": "Boat shelters fisher."
            },
            {
              "relationId": "R03",
              "text": "Fisher fears ocean."
            }
          ],
          "nodes": [],
          "inhale": "Select ocean threatens boat; boat shelters fisher; fisher fears ocean.",
          "compare": "Retrieve b1: all three selected meanings change: containment to threat, work-enabling to shelter, dependence to fear."
        },
        {
          "changes": [
            {
              "relationId": "R01",
              "text": "Harbour contains boat."
            },
            {
              "relationId": "R03",
              "text": "Fisher trusts harbour."
            }
          ],
          "nodes": [
            {
              "id": "n1",
              "label": "Harbour"
            }
          ],
          "inhale": "Select harbour contains boat; boat shelters fisher; fisher trusts harbour.",
          "compare": "Retrieve b2: ocean becomes harbour; threat becomes containment and fear becomes trust; shelter persists."
        },
        {
          "changes": [
            {
              "relationId": "R01",
              "text": "Ocean contains boat."
            },
            {
              "relationId": "R02",
              "text": "Boat enables fisher."
            },
            {
              "relationId": "R03",
              "text": "Fisher studies ocean."
            }
          ],
          "nodes": [
            {
              "id": "n1",
              "label": "Ocean"
            }
          ],
          "inhale": "Select ocean contains boat; boat enables fisher; fisher studies ocean.",
          "compare": "Retrieve b3: harbour becomes ocean; containment persists; shelter becomes work-enabling and trust becomes study."
        }
      ],
      "square": [
        {
          "changes": [],
          "nodes": [],
          "inhale": "Select all four baseline links.",
          "compare": "Seed the four-role organisation."
        },
        {
          "changes": [
            {
              "relationId": "R01",
              "text": "Ocean threatens boat."
            },
            {
              "relationId": "R02",
              "text": "Boat shelters fisher."
            }
          ],
          "nodes": [],
          "inhale": "Foreground ocean threatens boat and boat shelters fisher. Retain fisher supplies village and village depends on ocean.",
          "compare": "Retrieve b1: the first two selected meanings change; provision and dependence persist."
        },
        {
          "changes": [
            {
              "relationId": "R03",
              "text": "Village supports fisher.",
              "from": "n4",
              "to": "n3"
            }
          ],
          "nodes": [],
          "inhale": "Keep b2, but select village supports fisher in place of fisher supplies village.",
          "compare": "Retrieve b2: the fisher-village connection changes from provision to support in the opposite role direction."
        },
        {
          "changes": [
            {
              "relationId": "R01",
              "text": "Ocean contains boat."
            },
            {
              "relationId": "R02",
              "text": "Boat enables fisher."
            }
          ],
          "nodes": [],
          "inhale": "Select containment and work-enabling again; retain village supports fisher and village depends on ocean.",
          "compare": "Retrieve b3: the first two meanings return; the community-support perspective remains."
        }
      ],
      "pentagon": [
        {
          "changes": [],
          "nodes": [],
          "inhale": "Select the complete five-link baseline.",
          "compare": "Seed the production-and-dependence pattern."
        },
        {
          "changes": [
            {
              "relationId": "R04",
              "text": "Catch earns village income."
            }
          ],
          "nodes": [],
          "inhale": "Keep the other four links; select catch earns village income in place of catch nourishes village.",
          "compare": "Retrieve b1: the catch-village relation foregrounds income rather than nourishment."
        },
        {
          "changes": [
            {
              "relationId": "R03",
              "text": "Fisher sells catch."
            }
          ],
          "nodes": [],
          "inhale": "Retain b2; select fisher sells catch in place of fisher harvests catch.",
          "compare": "Retrieve b2: fisher-catch changes from harvesting to selling; the income relation persists."
        },
        {
          "changes": [
            {
              "relationId": "R05",
              "text": "Village regulates use of ocean."
            }
          ],
          "nodes": [],
          "inhale": "Retain b3; select village regulates ocean use in place of village depends on ocean.",
          "compare": "Retrieve b3: the closing relation foregrounds governance rather than dependence."
        }
      ],
      "hexagon": [
        {
          "changes": [],
          "nodes": [],
          "inhale": "Select all six baseline links.",
          "compare": "Seed the complete cycle, including both quota links."
        },
        {
          "changes": [
            {
              "relationId": "R04",
              "text": "Catch earns village income."
            }
          ],
          "nodes": [],
          "inhale": "Retain five links; foreground catch earns village income instead of nourishment.",
          "compare": "Retrieve b1: economic meaning replaces nutritional meaning in the selection."
        },
        {
          "changes": [
            {
              "relationId": "R05",
              "text": "Village enforces quota."
            }
          ],
          "nodes": [],
          "inhale": "Retain b2; select village enforces quota in place of village sets quota.",
          "compare": "Retrieve b2: distinguish implementing a rule from authoring it."
        },
        {
          "changes": [
            {
              "relationId": "R06",
              "text": "Quota allocates access to ocean."
            }
          ],
          "nodes": [],
          "inhale": "Retain b3; select quota allocates access to ocean in place of limiting extraction.",
          "compare": "Retrieve b3: foreground distribution of access rather than an extraction ceiling."
        }
      ],
      "heptagon": [
        {
          "changes": [],
          "nodes": [],
          "inhale": "Select all seven baseline links.",
          "compare": "Seed production, authority and regulation together."
        },
        {
          "changes": [
            {
              "relationId": "R04",
              "text": "Catch earns village income."
            }
          ],
          "nodes": [],
          "inhale": "Retain six links; foreground catch earns village income instead of nourishment.",
          "compare": "Retrieve b1: catch-village changes meaning; governance remains as recorded."
        },
        {
          "changes": [
            {
              "relationId": "R05",
              "text": "Village challenges council."
            }
          ],
          "nodes": [],
          "inhale": "Retain b2; select village challenges council in place of village authorises council.",
          "compare": "Retrieve b2: the authority relation is now experienced as contested."
        },
        {
          "changes": [
            {
              "relationId": "R06",
              "text": "Council reviews quota."
            }
          ],
          "nodes": [],
          "inhale": "Retain b3; select council reviews quota in place of council sets quota.",
          "compare": "Retrieve b3: the council-quota relation changes to review; the challenge remains visible."
        }
      ],
      "octagon": [
        {
          "changes": [],
          "nodes": [],
          "inhale": "Select all eight baseline links.",
          "compare": "Seed the system, including the distinction between estimate and ocean."
        },
        {
          "changes": [
            {
              "relationId": "R07",
              "text": "Quota is excessive under the updated stock estimate."
            },
            {
              "relationId": "R08",
              "text": "Updated stock estimate represents the ocean stock provisionally."
            }
          ],
          "nodes": [
            {
              "id": "n8",
              "label": "Updated stock estimate"
            }
          ],
          "inhale": "Imagine an updated estimate under which the unchanged quota is excessive. Retain other selected links.",
          "compare": "Retrieve b1: quota-estimate changes from accord to conflict; the estimate-ocean representation is explicitly updated."
        },
        {
          "changes": [
            {
              "relationId": "R07",
              "text": "Revised quota accords with the updated stock estimate."
            }
          ],
          "nodes": [
            {
              "id": "n7",
              "label": "Revised quota"
            }
          ],
          "inhale": "Imagine a revised quota that accords with that updated estimate. Keep the other selected relations.",
          "compare": "Retrieve b2: the conflict is resolved within this construction; the estimate is not replaced by the older one."
        },
        {
          "changes": [
            {
              "relationId": "R06",
              "text": "Council reviews the revised quota."
            }
          ],
          "nodes": [],
          "inhale": "Retain b3; foreground council reviews quota rather than council sets quota.",
          "compare": "Retrieve b3: change in the council's relation to the rule; quota-estimate accord remains."
        }
      ],
      "prism": [
        {
          "changes": [],
          "nodes": [],
          "inhale": "Select both triads and the three stated correspondences.",
          "compare": "Seed the full nine-link analogy."
        },
        {
          "changes": [
            {
              "relationId": "R05",
              "text": "Path restricts walker to an imposed route."
            },
            {
              "relationId": "R08",
              "text": "Boat and path contrast as enabling versus restricting access."
            }
          ],
          "nodes": [],
          "inhale": "Forest-path containment persists, but the path restricts the walker to an imposed route. Reframe boat-path as a contrast: enabling versus restricting access. Retain the other seven links.",
          "compare": "Retrieve b1: one internal function and the corresponding analogical bridge change together."
        },
        {
          "changes": [
            {
              "relationId": "R06",
              "text": "Walker cares for forest."
            },
            {
              "relationId": "R09",
              "text": "Fisher and walker contrast as dependence versus stewardship."
            }
          ],
          "nodes": [],
          "inhale": "Keep b2; foreground walker cares for forest in place of dependence. Reframe fisher-walker as dependence versus stewardship.",
          "compare": "Retrieve b2: walker-forest meaning and the agent bridge change; the access contrast persists."
        },
        {
          "changes": [
            {
              "relationId": "R03",
              "text": "Fisher cares for ocean."
            },
            {
              "relationId": "R09",
              "text": "Fisher and walker correspond as agents of stewardship."
            }
          ],
          "nodes": [],
          "inhale": "Keep b3; select fisher cares for ocean. Reframe fisher-walker as shared stewardship.",
          "compare": "Retrieve b3: one internal relation changes and that bridge becomes a match in the newly selected respect."
        }
      ],
      "cube": [
        {
          "changes": [],
          "nodes": [],
          "inhale": "Select both four-link cycles and all four stated role bridges.",
          "compare": "Seed all twelve relationships."
        },
        {
          "changes": [
            {
              "relationId": "R06",
              "text": "Irrigation restricts grower through rationing."
            },
            {
              "relationId": "R10",
              "text": "Boat and irrigation contrast as enabling versus restricting work."
            }
          ],
          "nodes": [],
          "inhale": "In the cultivation cycle, irrigation restricts the grower through rationing. Reframe boat-irrigation as enabling versus restricting work; retain ten other links.",
          "compare": "Retrieve b1: one functional relation and its bridge change."
        },
        {
          "changes": [
            {
              "relationId": "R07",
              "text": "Town supports grower.",
              "from": "n8",
              "to": "n7"
            },
            {
              "relationId": "R12",
              "text": "Village and town contrast as receiving provision versus supporting a producer."
            }
          ],
          "nodes": [],
          "inhale": "Keep b2; select town supports grower rather than grower supplies town. Reframe village-town as receiving provision versus supporting a producer.",
          "compare": "Retrieve b2: one community relation and its bridge change; the infrastructure contrast persists."
        },
        {
          "changes": [
            {
              "relationId": "R03",
              "text": "Village supports fisher.",
              "from": "n4",
              "to": "n3"
            },
            {
              "relationId": "R12",
              "text": "Village and town correspond as communities supporting producers."
            }
          ],
          "nodes": [],
          "inhale": "Keep b3; select village supports fisher. Reframe village-town as communities supporting producers.",
          "compare": "Retrieve b3: the fishing-community relation changes, restoring correspondence at that bridge."
        }
      ]
    },
    "heart": {
      "circle": [
        {
          "inhale": "Remembered kindness supports appreciation.",
          "compare": "Seed this one-relationship entry; there is no previous target.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "The same remembered kindness evokes longing.",
          "compare": "Retrieve breath 1: the memory remains identifiable, but its relation to appreciation is replaced by its relation to longing.",
          "changes": [
            {
              "relationId": "R01",
              "text": "The same remembered kindness evokes longing."
            }
          ],
          "nodes": [
            {
              "id": "n2",
              "label": "Longing"
            }
          ]
        },
        {
          "inhale": "Concern for the remembered friend motivates care.",
          "compare": "Retrieve breath 2: memory-to-longing and concern-to-care are different selected relationships. Do not pretend the feelings are identical.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Concern for the remembered friend motivates care."
            }
          ],
          "nodes": [
            {
              "id": "n1",
              "label": "Concern for friend"
            },
            {
              "id": "n2",
              "label": "Care"
            }
          ]
        },
        {
          "inhale": "Remembered kindness supports appreciation again.",
          "compare": "Retrieve breath 3: compare appreciation supported by memory with care motivated by concern. The similar entry at breath 1 is not the return target.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Remembered kindness supports appreciation."
            }
          ],
          "nodes": [
            {
              "id": "n1",
              "label": "Memory"
            },
            {
              "id": "n2",
              "label": "Appreciation"
            }
          ]
        }
      ],
      "half-circle": [
        {
          "inhale": "Hold both links: remembered kindness supports appreciation; appreciation gives that memory personal significance.",
          "compare": "Seed two distinct meanings between memory and appreciation, not two descriptions of one link.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "The memory now distracts from appreciation; appreciation still gives the memory personal significance.",
          "compare": "Retrieve breath 1: memory-to-appreciation changes from support to distraction; the significance relationship persists.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Memory distracts from appreciation."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "The memory still distracts from appreciation; appreciation now frames the memory as something to accept rather than something to celebrate.",
          "compare": "Retrieve breath 2: distraction persists; appreciation-to-memory changes from personal significance to acceptance.",
          "changes": [
            {
              "relationId": "R02",
              "text": "Appreciation frames the memory through acceptance."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "The memory again supports appreciation; appreciation continues to frame the memory through acceptance.",
          "compare": "Retrieve breath 3: support returns in one relationship; the acceptance relation remains. Earlier distraction is preserved in its own entry.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Remembered kindness supports appreciation."
            }
          ],
          "nodes": []
        }
      ],
      "triangle": [
        {
          "inhale": "Hold the full triad: memory supports appreciation; appreciation values the friend; memory represents the friend’s kindness.",
          "compare": "Seed the complete three-link pattern, including the memory’s representational role.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "The memory evokes concern rather than appreciation. Concern calls for attention to the friend, and the same memory still represents the friend’s kindness.",
          "compare": "Retrieve breath 1: the feeling role changes from appreciation to concern, changing two links; the memory-friend representation persists.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Memory evokes concern."
            },
            {
              "relationId": "R02",
              "text": "Concern calls for attention to friend."
            }
          ],
          "nodes": [
            {
              "id": "n2",
              "label": "Concern"
            }
          ]
        },
        {
          "inhale": "The same concern is supported by a memory that represents the friend’s difficulty rather than kindness. Concern still calls for attention to the friend.",
          "compare": "Retrieve breath 2: the memory-friend representation changes its selected meaning; the concern links persist.",
          "changes": [
            {
              "relationId": "R03",
              "text": "Memory represents the friend’s difficulty."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "The remembered difficulty supports compassion; compassion values the friend; the memory still represents that difficulty.",
          "compare": "Retrieve breath 3: concern becomes compassion in two selected relationships. The represented difficulty remains identifiable.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Remembered difficulty supports compassion."
            },
            {
              "relationId": "R02",
              "text": "Compassion values friend."
            }
          ],
          "nodes": [
            {
              "id": "n2",
              "label": "Compassion"
            }
          ]
        }
      ],
      "square": [
        {
          "inhale": "Hold memory supports appreciation; appreciation expresses care; care values friend; memory represents friend’s kindness.",
          "compare": "Seed all four links. Care is a meaning being selected, not a required physiological outcome.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep the other two links; foreground appreciation expressing obligation rather than care, with obligation directed toward the friend’s wellbeing.",
          "compare": "Retrieve breath 1: the care role is replaced by obligation, changing the feeling-to-motive and motive-to-friend links.",
          "changes": [
            {
              "relationId": "R02",
              "text": "Appreciation expresses obligation."
            },
            {
              "relationId": "R03",
              "text": "Obligation concerns friend’s wellbeing."
            }
          ],
          "nodes": [
            {
              "id": "n3",
              "label": "Obligation"
            }
          ]
        },
        {
          "inhale": "The same memory now evokes ambivalence rather than appreciation; ambivalence expresses obligation toward the friend; memory still represents the friend’s kindness.",
          "compare": "Retrieve breath 2: the feeling role changes and two incident meanings change. Do not erase the continuing obligation.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Memory evokes ambivalence."
            },
            {
              "relationId": "R02",
              "text": "Ambivalence expresses obligation."
            }
          ],
          "nodes": [
            {
              "id": "n2",
              "label": "Ambivalence"
            }
          ]
        },
        {
          "inhale": "The memory supports appreciation again; appreciation expresses freely chosen care; care values the friend; memory still represents kindness.",
          "compare": "Retrieve breath 3: identify both the feeling change and the distinction between obligation and chosen care.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Remembered kindness supports appreciation."
            },
            {
              "relationId": "R02",
              "text": "Appreciation expresses freely chosen care."
            },
            {
              "relationId": "R03",
              "text": "Care values friend."
            }
          ],
          "nodes": [
            {
              "id": "n2",
              "label": "Appreciation"
            },
            {
              "id": "n3",
              "label": "Care"
            }
          ]
        }
      ],
      "pentagon": [
        {
          "inhale": "Hold the five-link baseline: memory supports appreciation; appreciation expresses care; care motivates a wish; the wish concerns the friend’s wellbeing; memory represents the friend.",
          "compare": "Seed the whole five-link pattern, including what the wish concerns.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep four links; the selected wish now specifically concerns the friend’s autonomy.",
          "compare": "Retrieve breath 1: the wish-friend meaning becomes more specific. Neither comfort nor autonomy is inferred from a chest sensation.",
          "changes": [
            {
              "relationId": "R04",
              "text": "Wish concerns friend’s autonomy."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep that wish; care now limits the wish so it leaves the friend free to choose, rather than simply motivating it.",
          "compare": "Retrieve breath 2: care-to-wish changes from motivation to restraint; the friend’s autonomy remains its concern.",
          "changes": [
            {
              "relationId": "R03",
              "text": "Care limits the wish to leave the friend free to choose."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep those relations; foreground the memory reminding you of the friend’s independence rather than merely representing the friend.",
          "compare": "Retrieve breath 3: the closing memory-friend relation changes; the wish and its restraint remain recoverable.",
          "changes": [
            {
              "relationId": "R05",
              "text": "Memory represents friend’s independence."
            }
          ],
          "nodes": []
        }
      ],
      "hexagon": [
        {
          "inhale": "Hold all six links: memory supports appreciation; appreciation expresses care; care motivates a wish; wish concerns friend; friend belongs to remembered context; context gives memory meaning.",
          "compare": "Seed the full relation between the care experience and its remembered setting.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep five links; the remembered context makes the memory ambiguous rather than giving it one settled meaning.",
          "compare": "Retrieve breath 1: the context-memory relationship changes to ambiguity. Ambiguity is a represented relationship, not permission to fabricate a new memory.",
          "changes": [
            {
              "relationId": "R06",
              "text": "Context makes the memory ambiguous."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep the ambiguity; the wish now specifically concerns understanding the friend.",
          "compare": "Retrieve breath 2: wish-friend narrows from general wellbeing to understanding the friend; the unresolved contextual meaning remains.",
          "changes": [
            {
              "relationId": "R04",
              "text": "Wish concerns understanding the friend."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep the other links; a more specific remembered context now qualifies the memory’s meaning rather than leaving it wholly ambiguous.",
          "compare": "Retrieve breath 3: note the limited clarification. It does not prove the remembered event happened exactly as imagined.",
          "changes": [
            {
              "relationId": "R06",
              "text": "Context qualifies the memory’s meaning."
            }
          ],
          "nodes": []
        }
      ],
      "heptagon": [
        {
          "inhale": "Hold all seven baseline links, including context informs interpretation and interpretation frames memory.",
          "compare": "Seed the care pattern together with the interpretation that gives the memory its meaning.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep six links; context challenges the interpretation instead of merely informing it.",
          "compare": "Retrieve breath 1: the context-interpretation connection now supplies a counterpoint. Keep the original memory identifiable.",
          "changes": [
            {
              "relationId": "R06",
              "text": "Context challenges interpretation."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep that challenge; interpretation now frames the memory as mixed rather than wholly generous.",
          "compare": "Retrieve breath 2: interpretation-memory changes; the contextual challenge remains selected.",
          "changes": [
            {
              "relationId": "R07",
              "text": "Interpretation frames memory as mixed."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep the qualified interpretation; foreground appreciation permitting care rather than merely expressing it.",
          "compare": "Retrieve breath 3: feeling-to-care changes from expression to permission, while the contextual challenge and mixed memory remain part of the seven-link model.",
          "changes": [
            {
              "relationId": "R02",
              "text": "Appreciation permits care without demanding it."
            }
          ],
          "nodes": []
        }
      ],
      "octagon": [
        {
          "inhale": "Hold the eight-link baseline, including interpretation acknowledges uncertainty and uncertainty limits claims about memory.",
          "compare": "Seed all eight links; the boundary on what the memory establishes is explicit.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep seven links; interpretation conceals uncertainty instead of acknowledging it in this imagined episode.",
          "compare": "Retrieve breath 1: one epistemic relationship changes. Concealing uncertainty does not remove the uncertainty-memory limitation.",
          "changes": [
            {
              "relationId": "R07",
              "text": "Interpretation conceals uncertainty."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep the other links; interpretation acknowledges uncertainty again.",
          "compare": "Retrieve breath 2: the acknowledgment is restored. This is a change in how the experience is represented, not proof that recall improved.",
          "changes": [
            {
              "relationId": "R07",
              "text": "Interpretation acknowledges uncertainty."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep that acknowledgment; uncertainty now limits only the recalled motive, rather than every aspect of the memory.",
          "compare": "Retrieve breath 3: the scope of the uncertainty-memory relation narrows. The other seven selected relationships persist.",
          "changes": [
            {
              "relationId": "R08",
              "text": "Uncertainty limits claims about the motive represented in memory."
            }
          ],
          "nodes": []
        }
      ],
      "prism": [
        {
          "inhale": "Hold both care triads and all three bridges: memory/appreciation/friend and pet-memory/fondness/pet; compare memories, valuing feelings and recipients of care.",
          "compare": "Seed all nine selected links. The analogy is current content, separate from the historical return.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "In the pet triad, fondness becomes protectiveness: pet-memory supports protectiveness; protectiveness attends to the pet’s vulnerability. Reframe the feeling bridge as appreciation versus protective concern; retain six other links.",
          "compare": "Retrieve breath 1: two within-triad meanings and the feeling bridge change. A difference need not destroy the other two correspondences.",
          "changes": [
            {
              "relationId": "R04",
              "text": "Pet memory supports protectiveness."
            },
            {
              "relationId": "R05",
              "text": "Protectiveness attends to pet’s vulnerability."
            },
            {
              "relationId": "R08",
              "text": "Appreciation and protectiveness contrast as appreciation versus protective concern."
            }
          ],
          "nodes": [
            {
              "id": "n5",
              "label": "Protectiveness"
            }
          ]
        },
        {
          "inhale": "Keep that contrast; the pet-memory now represents the pet’s vulnerability rather than the pet in general.",
          "compare": "Retrieve breath 2: one representational link changes. Both memories remain memories of valued relationships, so that bridge can persist within its stated scope.",
          "changes": [
            {
              "relationId": "R06",
              "text": "Pet memory represents pet’s vulnerability."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep the pet triad; appreciation now values the friend through concern for the friend’s vulnerability. Reframe the feeling bridge as a shared concern for the other’s vulnerability.",
          "compare": "Retrieve breath 3: the friend-directed feeling relation and the feeling bridge change together; preserve the limits of the analogy.",
          "changes": [
            {
              "relationId": "R02",
              "text": "Appreciation values friend through protective concern."
            },
            {
              "relationId": "R08",
              "text": "Appreciation and protectiveness correspond as concern for the other’s vulnerability."
            }
          ],
          "nodes": []
        }
      ],
      "cube": [
        {
          "inhale": "Hold both four-link care cycles and their four bridges: human memory/appreciation/care/friend and pet-memory/fondness/animal-care/pet.",
          "compare": "Seed all twelve links, including the care and recipient correspondences.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "In the pet cycle, animal-care now values the pet through respecting its need for space. Retain the other eleven links.",
          "compare": "Retrieve breath 1: one care-recipient meaning changes. The bridge can still hold at the broad level of caring without implying identical actions.",
          "changes": [
            {
              "relationId": "R07",
              "text": "Animal care respects pet’s need for space."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep the pet’s need for space; in the human cycle, care now values the friend through respect for their independence.",
          "compare": "Retrieve breath 2: one human care-recipient relation changes. The pet’s separate needs remain its own.",
          "changes": [
            {
              "relationId": "R03",
              "text": "Care respects friend’s independence."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep both cycles; refine the care-to-care bridge from general care to care that respects the other’s autonomy.",
          "compare": "Retrieve breath 3: a selected correspondence becomes more specific. This compares meanings, not evidence that a person and a pet have identical needs.",
          "changes": [
            {
              "relationId": "R11",
              "text": "Care and animal care correspond as concern that respects the other’s autonomy."
            }
          ],
          "nodes": []
        }
      ]
    },
    "body": {
      "circle": [
        {
          "inhale": "In this seated example, the chair is experienced as supporting the torso.",
          "compare": "Seed the support relationship: chair and torso are two roles in one selected relation.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "The same chair is experienced as restricting the torso’s available movement.",
          "compare": "Retrieve breath 1: support changes to constraint in the selected meaning. Support may still be true without being counted in this entry.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Chair restricts the torso’s available movement."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "The torso is experienced as loading the chair.",
          "compare": "Retrieve breath 2: the relationship changes from constraint on movement to load borne by the chair. This is a felt interpretation, not a measurement of force.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Torso is experienced as loading chair.",
              "from": "n2",
              "to": "n1"
            }
          ],
          "nodes": []
        },
        {
          "inhale": "The chair is experienced as supporting the torso again.",
          "compare": "Retrieve breath 3: compare support with loading. Return to the loading entry, not the similar support entry at breath 1.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Chair supports torso as experienced.",
              "from": "n1",
              "to": "n2"
            }
          ],
          "nodes": []
        }
      ],
      "half-circle": [
        {
          "inhale": "Select chair supports torso and chair restricts the torso’s available movement.",
          "compare": "Seed two distinct meanings: support and restriction. They are not inverse descriptions of one relation.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep support; select chair permits the torso’s chosen movement in place of restriction.",
          "compare": "Retrieve breath 1: the support relation persists while the movement relation changes from restriction to permission in this imagined encounter.",
          "changes": [
            {
              "relationId": "R02",
              "text": "Chair permits the torso’s chosen movement."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep the movement permission; the chair’s support is now experienced as unreliable rather than dependable.",
          "compare": "Retrieve breath 2: the support relation changes its appraisal; movement permission persists. This does not establish a structural fault in the chair.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Chair’s support of torso is experienced as unreliable."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Support is experienced as dependable again; permission for the chosen movement remains selected.",
          "compare": "Retrieve breath 3: the support appraisal changes again. Preserve the earlier uncertainty as part of its original record.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Chair’s support of torso is experienced as dependable."
            }
          ],
          "nodes": []
        }
      ],
      "triangle": [
        {
          "inhale": "Hold chair supports torso; torso contains felt pressure; pressure registers contact with chair.",
          "compare": "Seed support, containment and contact-significance as three distinct links.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep the first two links; pressure is interpreted as a warning about chair contact rather than simply registering contact.",
          "compare": "Retrieve breath 1: the pressure-chair meaning changes. A warning interpretation is not a diagnosis or proof of harm.",
          "changes": [
            {
              "relationId": "R03",
              "text": "Pressure is interpreted as a warning about chair contact."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep that interpretation; the chair is now experienced as restricting the torso rather than supporting it.",
          "compare": "Retrieve breath 2: the chair-torso meaning changes while the pressure and its interpreted warning remain identifiable.",
          "changes": [
            {
              "relationId": "R01",
              "text": "Chair restricts torso as experienced."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep the chair’s restriction; pressure is again understood simply as contact with chair.",
          "compare": "Retrieve breath 3: the warning interpretation is withdrawn while the selected restriction relation persists.",
          "changes": [
            {
              "relationId": "R03",
              "text": "Pressure registers contact with chair."
            }
          ],
          "nodes": []
        }
      ],
      "square": [
        {
          "inhale": "Hold chair supports torso; torso contains pressure; pressure informs support judgment; support judgment concerns chair.",
          "compare": "Seed the four-link model, separating felt pressure from the judgment made from it.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep three links; pressure challenges the support judgment instead of merely informing it.",
          "compare": "Retrieve breath 1: sensation-to-judgment becomes a challenge. Do not rewrite the pressure to fit the judgment.",
          "changes": [
            {
              "relationId": "R03",
              "text": "Pressure challenges support judgment."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep that challenge; the judgment concerns the chair’s constraint on movement rather than its support.",
          "compare": "Retrieve breath 2: the judgment-chair meaning changes; pressure and the challenge remain represented separately.",
          "changes": [
            {
              "relationId": "R04",
              "text": "Support judgment concerns chair’s constraint on movement."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep the other links; pressure now qualifies the judgment rather than broadly challenging it.",
          "compare": "Retrieve breath 3: the pressure-judgment relation becomes a qualification. Preserve what remains uncertain.",
          "changes": [
            {
              "relationId": "R03",
              "text": "Pressure qualifies support judgment."
            }
          ],
          "nodes": []
        }
      ],
      "pentagon": [
        {
          "inhale": "Hold chair supports torso; torso contains pressure; pressure informs description; description supports support judgment; support judgment concerns chair.",
          "compare": "Seed all five links, including the distinction between sensation and its verbal description.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep four links; foreground description exaggerating the pressure, rather than only noting that pressure informs description.",
          "compare": "Retrieve breath 1: the pressure-description fit is now explicitly represented as distortion. The sensation itself has not been declared stronger.",
          "changes": [
            {
              "relationId": "R03",
              "text": "Description exaggerates pressure.",
              "from": "n4",
              "to": "n3"
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep that mismatch; description undermines the support judgment rather than supporting it.",
          "compare": "Retrieve breath 2: description-judgment changes; the earlier description-pressure mismatch persists.",
          "changes": [
            {
              "relationId": "R04",
              "text": "Description undermines support judgment."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Use a description that now fits the pressure; keep the other selected links, including its challenge to the support judgment.",
          "compare": "Retrieve breath 3: repair the description-pressure relation without assuming the interpretation has also been repaired.",
          "changes": [
            {
              "relationId": "R03",
              "text": "Description represents pressure faithfully.",
              "from": "n4",
              "to": "n3"
            }
          ],
          "nodes": []
        }
      ],
      "hexagon": [
        {
          "inhale": "Hold all six links, including support judgment is interpreted within context and context includes chair as support.",
          "compare": "Seed the complete model of sensation, description, interpretation and setting.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep five links; context now qualifies the support judgment rather than merely housing its interpretation.",
          "compare": "Retrieve breath 1: a contextual limit on the judgment becomes explicit. Keep the recorded sensation unchanged.",
          "changes": [
            {
              "relationId": "R05",
              "text": "Context qualifies support judgment.",
              "from": "n6",
              "to": "n5"
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep that qualification; context presents the chair as a movement constraint rather than as support.",
          "compare": "Retrieve breath 2: context-chair changes meaning, while the judgment’s contextual qualification persists.",
          "changes": [
            {
              "relationId": "R06",
              "text": "Context presents chair as a movement constraint."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep the constraint interpretation; revise description to represent pressure more precisely, without adding another sensation.",
          "compare": "Retrieve breath 3: pressure-description changes in fidelity. Greater detail is not itself evidence that the body changed.",
          "changes": [
            {
              "relationId": "R03",
              "text": "Description represents pressure more precisely.",
              "from": "n4",
              "to": "n3"
            }
          ],
          "nodes": []
        }
      ],
      "heptagon": [
        {
          "inhale": "Hold the seven-link baseline, including judgment compared with expected support, expectation shaped by context, and context including chair.",
          "compare": "Seed the sensation-to-expectation model without treating expectation as observed support.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep six links; the support judgment conflicts with expected support rather than merely being compared with it.",
          "compare": "Retrieve breath 1: the judgment-expectation relation becomes a discrepancy. Do not change either source to make them agree.",
          "changes": [
            {
              "relationId": "R05",
              "text": "Support judgment conflicts with expected support."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep that discrepancy; expectation is questioned by the context rather than simply shaped by it.",
          "compare": "Retrieve breath 2: the expectation-context relation changes. The felt pressure is still the separately recorded sensation.",
          "changes": [
            {
              "relationId": "R06",
              "text": "Expectation is questioned by context."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep the contextual question; a revised judgment qualifies the expectation instead of simply conflicting with it.",
          "compare": "Retrieve breath 3: the discrepancy narrows to a qualification. The expectation remains open to revision.",
          "changes": [
            {
              "relationId": "R05",
              "text": "Support judgment qualifies expectation."
            }
          ],
          "nodes": []
        }
      ],
      "octagon": [
        {
          "inhale": "Hold all eight baseline links: chair, torso, pressure, attention, description, judgment, expectation and context in their registered cycle.",
          "compare": "Seed the whole model, including attention’s part in what gets described.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Keep seven links; foreground attention filtering out part of the description, rather than only noting that it selects description.",
          "compare": "Retrieve breath 1: attention-description becomes a selective omission. The model does not infer that the omitted sensation disappeared.",
          "changes": [
            {
              "relationId": "R04",
              "text": "Attention filters out part of description."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep that omission visible; judgment now conflicts with the expectation rather than merely being compared with it.",
          "compare": "Retrieve breath 2: one additional relation changes. Keep descriptive selection and interpretive discrepancy distinct.",
          "changes": [
            {
              "relationId": "R06",
              "text": "Support judgment conflicts with expected support."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Attention now selects a description that includes the previously omitted aspect; retain the judgment-expectation conflict.",
          "compare": "Retrieve breath 3: one selection error is repaired; the remaining interpretive discrepancy is not silently resolved.",
          "changes": [
            {
              "relationId": "R04",
              "text": "Attention selects description including the previously omitted aspect."
            }
          ],
          "nodes": []
        }
      ],
      "prism": [
        {
          "inhale": "Hold the chair/torso/pressure triad and floor/feet/sole-sensation triad, with bridges between support surfaces, body regions and contact signals.",
          "compare": "Seed all nine links. These are two distinct regions in the same mapping exercise, not two interchangeable sensations.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "The sole sensation is interpreted as warning about floor contact rather than merely registering it. Reframe the sensation bridge as simple contact-significance versus warning-significance; keep seven other links.",
          "compare": "Retrieve breath 1: one within-triad meaning and its bridge change. The two sensations remain separately identified.",
          "changes": [
            {
              "relationId": "R06",
              "text": "Sole sensation is interpreted as a warning about floor contact."
            },
            {
              "relationId": "R09",
              "text": "Pressure and sole sensation contrast as contact-significance versus warning-significance."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep that contrast; floor is experienced as constraining the feet rather than supporting them. Reframe the surface bridge as support versus constraint; keep the other links.",
          "compare": "Retrieve breath 2: the floor-feet relation and surface correspondence change. Do not infer the torso feels the same constraint.",
          "changes": [
            {
              "relationId": "R04",
              "text": "Floor constrains feet as experienced."
            },
            {
              "relationId": "R07",
              "text": "Chair and floor contrast as support versus movement constraint."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "The sole sensation again registers contact without the warning interpretation. Restore the contact-signal bridge; retain the floor’s selected constraint.",
          "compare": "Retrieve breath 3: one interpretation and its bridge are repaired; the surface contrast remains.",
          "changes": [
            {
              "relationId": "R06",
              "text": "Sole sensation registers contact with floor."
            },
            {
              "relationId": "R09",
              "text": "Pressure and sole sensation correspond as experienced contact signals."
            }
          ],
          "nodes": []
        }
      ],
      "cube": [
        {
          "inhale": "Hold chair/torso/pressure/support-judgment and floor/feet/sole-sensation/footing-judgment, with four bridges matching surfaces, regions, sensations and judgments.",
          "compare": "Seed all twelve links. Each judgment remains attached to its own sensation and setting.",
          "changes": [],
          "nodes": []
        },
        {
          "inhale": "Sole sensation challenges the footing judgment rather than merely informing it. Reframe the judgment bridge as a judgment informed by sensation versus one challenged by sensation; retain ten other links.",
          "compare": "Retrieve breath 1: one sensation-judgment relation and the judgment bridge change together.",
          "changes": [
            {
              "relationId": "R07",
              "text": "Sole sensation challenges footing judgment."
            },
            {
              "relationId": "R12",
              "text": "Support judgment and footing judgment contrast as an interpretation informed by sensation versus one challenged by sensation."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep that discrepancy; pressure now also challenges the chair-support judgment. Reframe the judgment bridge as two challenged interpretations.",
          "compare": "Retrieve breath 2: one relation in the first cycle changes; the judgment bridge now matches in that limited respect.",
          "changes": [
            {
              "relationId": "R03",
              "text": "Pressure challenges support judgment."
            },
            {
              "relationId": "R12",
              "text": "Support judgment and footing judgment correspond as challenged interpretations."
            }
          ],
          "nodes": []
        },
        {
          "inhale": "Keep both challenges; foreground the sensation bridge as two differently located contact experiences, with their causes left unestablished.",
          "compare": "Retrieve breath 3: the bridge’s scope is made explicit. Similar roles do not establish a common physiological explanation.",
          "changes": [
            {
              "relationId": "R11",
              "text": "Pressure and sole sensation correspond as differently located contact experiences without establishing a shared cause."
            }
          ],
          "nodes": []
        }
      ]
    }
  },
  "high": {
    "stream": {
      "dodecahedron": {
        "nodes": [
          {
            "id": "A0",
            "label": "tank"
          },
          {
            "id": "A1",
            "label": "watering system"
          },
          {
            "id": "A2",
            "label": "garden"
          },
          {
            "id": "A3",
            "label": "produce"
          },
          {
            "id": "A4",
            "label": "kitchen"
          },
          {
            "id": "A5",
            "label": "meals"
          },
          {
            "id": "A6",
            "label": "volunteers"
          },
          {
            "id": "A7",
            "label": "workshop"
          },
          {
            "id": "A8",
            "label": "pump"
          },
          {
            "id": "A9",
            "label": "rain collector"
          },
          {
            "id": "B0",
            "label": "filter"
          },
          {
            "id": "B1",
            "label": "water committee"
          },
          {
            "id": "B2",
            "label": "water quality"
          },
          {
            "id": "B3",
            "label": "budget"
          },
          {
            "id": "B4",
            "label": "health"
          },
          {
            "id": "B5",
            "label": "market"
          },
          {
            "id": "B6",
            "label": "care team"
          },
          {
            "id": "B7",
            "label": "training"
          },
          {
            "id": "B8",
            "label": "inspection"
          },
          {
            "id": "B9",
            "label": "council"
          }
        ],
        "relations": [
          {
            "id": "D01",
            "from": "A0",
            "to": "A1",
            "text": "Tank supplies watering system.",
            "kind": "outer cycle"
          },
          {
            "id": "D02",
            "from": "A1",
            "to": "A2",
            "text": "Watering system sustains garden.",
            "kind": "outer cycle"
          },
          {
            "id": "D03",
            "from": "A2",
            "to": "A3",
            "text": "Garden yields produce.",
            "kind": "outer cycle"
          },
          {
            "id": "D04",
            "from": "A3",
            "to": "A4",
            "text": "Produce supplies kitchen.",
            "kind": "outer cycle"
          },
          {
            "id": "D05",
            "from": "A4",
            "to": "A5",
            "text": "Kitchen prepares meals.",
            "kind": "outer cycle"
          },
          {
            "id": "D06",
            "from": "A5",
            "to": "A6",
            "text": "Meals nourish volunteers.",
            "kind": "outer cycle"
          },
          {
            "id": "D07",
            "from": "A6",
            "to": "A7",
            "text": "Volunteers staff workshop.",
            "kind": "outer cycle"
          },
          {
            "id": "D08",
            "from": "A7",
            "to": "A8",
            "text": "Workshop repairs pump.",
            "kind": "outer cycle"
          },
          {
            "id": "D09",
            "from": "A8",
            "to": "A9",
            "text": "Pump drains rain collector.",
            "kind": "outer cycle"
          },
          {
            "id": "D10",
            "from": "A9",
            "to": "A0",
            "text": "Rain collector replenishes tank.",
            "kind": "outer cycle"
          },
          {
            "id": "D11",
            "from": "B0",
            "to": "B2",
            "text": "Filter improves water quality.",
            "kind": "health cycle"
          },
          {
            "id": "D12",
            "from": "B2",
            "to": "B4",
            "text": "Water quality supports health.",
            "kind": "health cycle"
          },
          {
            "id": "D13",
            "from": "B4",
            "to": "B6",
            "text": "Health sets the care priorities of care team.",
            "kind": "health cycle"
          },
          {
            "id": "D14",
            "from": "B6",
            "to": "B8",
            "text": "Care team commissions inspection.",
            "kind": "health cycle"
          },
          {
            "id": "D15",
            "from": "B8",
            "to": "B0",
            "text": "Inspection evaluates filter.",
            "kind": "health cycle"
          },
          {
            "id": "D16",
            "from": "B1",
            "to": "B3",
            "text": "Water committee allocates budget.",
            "kind": "governance cycle"
          },
          {
            "id": "D17",
            "from": "B3",
            "to": "B5",
            "text": "Budget underwrites market.",
            "kind": "governance cycle"
          },
          {
            "id": "D18",
            "from": "B5",
            "to": "B7",
            "text": "Market finances training.",
            "kind": "governance cycle"
          },
          {
            "id": "D19",
            "from": "B7",
            "to": "B9",
            "text": "Training equips council.",
            "kind": "governance cycle"
          },
          {
            "id": "D20",
            "from": "B9",
            "to": "B1",
            "text": "Council appoints water committee.",
            "kind": "governance cycle"
          },
          {
            "id": "D21",
            "from": "A0",
            "to": "B0",
            "text": "Tank is protected by filter.",
            "kind": "bridges"
          },
          {
            "id": "D22",
            "from": "A1",
            "to": "B1",
            "text": "Watering system is governed by water committee.",
            "kind": "bridges"
          },
          {
            "id": "D23",
            "from": "A2",
            "to": "B2",
            "text": "Garden depends on water quality.",
            "kind": "bridges"
          },
          {
            "id": "D24",
            "from": "A3",
            "to": "B3",
            "text": "Produce contributes revenue to budget.",
            "kind": "bridges"
          },
          {
            "id": "D25",
            "from": "A4",
            "to": "B4",
            "text": "Kitchen protects health.",
            "kind": "bridges"
          },
          {
            "id": "D26",
            "from": "A5",
            "to": "B5",
            "text": "Meals are sold at market.",
            "kind": "bridges"
          },
          {
            "id": "D27",
            "from": "A6",
            "to": "B6",
            "text": "Volunteers serve on care team.",
            "kind": "bridges"
          },
          {
            "id": "D28",
            "from": "A7",
            "to": "B7",
            "text": "Workshop hosts training.",
            "kind": "bridges"
          },
          {
            "id": "D29",
            "from": "A8",
            "to": "B8",
            "text": "Pump is assessed by inspection.",
            "kind": "bridges"
          },
          {
            "id": "D30",
            "from": "A9",
            "to": "B9",
            "text": "Rain collector is regulated by council.",
            "kind": "bridges"
          }
        ],
        "fourBreaths": [
          {
            "inhale": "Receive the cooperative as the registered thirty-link whole.",
            "compare": "Seed the complete prepared model; there is no earlier entry.",
            "changes": []
          },
          {
            "inhale": "Imagine the workshop cannot repair the pump. Replace the workshop-pump repair relation with inability; retain the other twenty-nine.",
            "compare": "Retrieve b1: one maintenance dependency is now blocked. Do not silently revise downstream links as if consequences were observed.",
            "changes": [
              {
                "relationId": "D08",
                "text": "Workshop currently cannot repair pump."
              }
            ]
          },
          {
            "inhale": "Keep that blockage; imagine inspection postpones evaluation of the filter. Retain the other twenty-eight links.",
            "compare": "Retrieve b2: one additional oversight relation changes; the pump problem persists.",
            "changes": [
              {
                "relationId": "D15",
                "text": "Inspection postpones evaluation of filter."
              }
            ]
          },
          {
            "inhale": "Imagine the workshop can repair the pump again, while inspection remains postponed.",
            "compare": "Retrieve b3: repair is restored; inspection remains postponed in the model.",
            "changes": [
              {
                "relationId": "D08",
                "text": "Workshop repairs pump."
              }
            ]
          }
        ]
      },
      "icosahedron": {
        "nodes": [
          {
            "id": "N",
            "label": "service brief"
          },
          {
            "id": "S",
            "label": "budget"
          },
          {
            "id": "U0",
            "label": "safety"
          },
          {
            "id": "U1",
            "label": "accessibility"
          },
          {
            "id": "U2",
            "label": "reliability"
          },
          {
            "id": "U3",
            "label": "affordability"
          },
          {
            "id": "U4",
            "label": "ecological impact"
          },
          {
            "id": "L0",
            "label": "vessel design"
          },
          {
            "id": "L1",
            "label": "terminal design"
          },
          {
            "id": "L2",
            "label": "timetable"
          },
          {
            "id": "L3",
            "label": "fares"
          },
          {
            "id": "L4",
            "label": "propulsion"
          }
        ],
        "relations": [
          {
            "id": "I01",
            "from": "N",
            "to": "U0",
            "text": "Service brief sets the target for safety.",
            "kind": "brief to criteria"
          },
          {
            "id": "I02",
            "from": "N",
            "to": "U1",
            "text": "Service brief sets the target for accessibility.",
            "kind": "brief to criteria"
          },
          {
            "id": "I03",
            "from": "N",
            "to": "U2",
            "text": "Service brief sets the target for reliability.",
            "kind": "brief to criteria"
          },
          {
            "id": "I04",
            "from": "N",
            "to": "U3",
            "text": "Service brief sets the target for affordability.",
            "kind": "brief to criteria"
          },
          {
            "id": "I05",
            "from": "N",
            "to": "U4",
            "text": "Service brief sets the target for ecological impact.",
            "kind": "brief to criteria"
          },
          {
            "id": "I06",
            "from": "S",
            "to": "L0",
            "text": "Budget funds the implementation of vessel design.",
            "kind": "budget to choices"
          },
          {
            "id": "I07",
            "from": "S",
            "to": "L1",
            "text": "Budget funds the implementation of terminal design.",
            "kind": "budget to choices"
          },
          {
            "id": "I08",
            "from": "S",
            "to": "L2",
            "text": "Budget funds the implementation of timetable.",
            "kind": "budget to choices"
          },
          {
            "id": "I09",
            "from": "S",
            "to": "L3",
            "text": "Budget funds the implementation of fares.",
            "kind": "budget to choices"
          },
          {
            "id": "I10",
            "from": "S",
            "to": "L4",
            "text": "Budget funds the implementation of propulsion.",
            "kind": "budget to choices"
          },
          {
            "id": "I11",
            "from": "U0",
            "to": "U1",
            "text": "Safety shapes the implementation of accessibility.",
            "kind": "criteria cycle"
          },
          {
            "id": "I12",
            "from": "U1",
            "to": "U2",
            "text": "Accessibility affects reliability.",
            "kind": "criteria cycle"
          },
          {
            "id": "I13",
            "from": "U2",
            "to": "U3",
            "text": "Reliability constrains affordability through its operating costs.",
            "kind": "criteria cycle"
          },
          {
            "id": "I14",
            "from": "U3",
            "to": "U4",
            "text": "Affordability influences ecological impact through transport mode choice.",
            "kind": "criteria cycle"
          },
          {
            "id": "I15",
            "from": "U4",
            "to": "U0",
            "text": "Ecological impact must remain consistent with safety.",
            "kind": "criteria cycle"
          },
          {
            "id": "I16",
            "from": "L0",
            "to": "L1",
            "text": "Vessel design sets interface requirements for terminal design.",
            "kind": "design cycle"
          },
          {
            "id": "I17",
            "from": "L1",
            "to": "L2",
            "text": "Terminal design sets turnaround constraints on timetable.",
            "kind": "design cycle"
          },
          {
            "id": "I18",
            "from": "L2",
            "to": "L3",
            "text": "Timetable has costs reflected in fares.",
            "kind": "design cycle"
          },
          {
            "id": "I19",
            "from": "L3",
            "to": "L4",
            "text": "Fares provide revenue for propulsion.",
            "kind": "design cycle"
          },
          {
            "id": "I20",
            "from": "L4",
            "to": "L0",
            "text": "Propulsion sets integration requirements for vessel design.",
            "kind": "design cycle"
          },
          {
            "id": "I21",
            "from": "U0",
            "to": "L0",
            "text": "Safety sets requirements for vessel design.",
            "kind": "criteria to choices"
          },
          {
            "id": "I22",
            "from": "U0",
            "to": "L4",
            "text": "Safety sets requirements for propulsion.",
            "kind": "criteria to choices"
          },
          {
            "id": "I23",
            "from": "U1",
            "to": "L1",
            "text": "Accessibility sets requirements for terminal design.",
            "kind": "criteria to choices"
          },
          {
            "id": "I24",
            "from": "U1",
            "to": "L0",
            "text": "Accessibility sets requirements for vessel design.",
            "kind": "criteria to choices"
          },
          {
            "id": "I25",
            "from": "U2",
            "to": "L2",
            "text": "Reliability sets requirements for timetable.",
            "kind": "criteria to choices"
          },
          {
            "id": "I26",
            "from": "U2",
            "to": "L1",
            "text": "Reliability sets requirements for terminal design.",
            "kind": "criteria to choices"
          },
          {
            "id": "I27",
            "from": "U3",
            "to": "L3",
            "text": "Affordability sets requirements for fares.",
            "kind": "criteria to choices"
          },
          {
            "id": "I28",
            "from": "U3",
            "to": "L2",
            "text": "Affordability sets requirements for timetable.",
            "kind": "criteria to choices"
          },
          {
            "id": "I29",
            "from": "U4",
            "to": "L4",
            "text": "Ecological impact sets requirements for propulsion.",
            "kind": "criteria to choices"
          },
          {
            "id": "I30",
            "from": "U4",
            "to": "L3",
            "text": "Ecological impact sets requirements for fares.",
            "kind": "criteria to choices"
          }
        ],
        "fourBreaths": [
          {
            "inhale": "Receive the full registered ferry model.",
            "compare": "Seed the complete prepared model; there is no earlier entry.",
            "changes": []
          },
          {
            "inhale": "Imagine the budget withdraws support for the fare policy. Retain the other twenty-nine links.",
            "compare": "Retrieve b1: the budget-fares relation changes from funding to withdrawal of support.",
            "changes": [
              {
                "relationId": "I09",
                "text": "Budget withdraws support for the fare policy."
              }
            ]
          },
          {
            "inhale": "Keep that withdrawal; imagine accessibility requirements exclude the current vessel design. Retain the other twenty-eight links.",
            "compare": "Retrieve b2: accessibility-vessel becomes a specific incompatibility; fare-policy support remains withdrawn.",
            "changes": [
              {
                "relationId": "I24",
                "text": "Accessibility requirements exclude the current vessel design."
              }
            ]
          },
          {
            "inhale": "Imagine a revised vessel design satisfying accessibility. Keep the funding withdrawal and other declared relations.",
            "compare": "Retrieve b3: that incompatibility is resolved in the imagined design. This is not external engineering verification.",
            "changes": [
              {
                "relationId": "I24",
                "text": "Accessibility requirements are satisfied by the revised imagined vessel design."
              }
            ]
          }
        ]
      }
    },
    "heart": {
      "dodecahedron": {
        "nodes": [
          {
            "id": "A0",
            "label": "Care intention"
          },
          {
            "id": "A1",
            "label": "Heart attention"
          },
          {
            "id": "A2",
            "label": "Felt response"
          },
          {
            "id": "A3",
            "label": "Meaning hypothesis"
          },
          {
            "id": "A4",
            "label": "Gentle phrase"
          },
          {
            "id": "A5",
            "label": "Practice choice"
          },
          {
            "id": "A6",
            "label": "Session record"
          },
          {
            "id": "A7",
            "label": "Later review"
          },
          {
            "id": "A8",
            "label": "Next intention"
          },
          {
            "id": "A9",
            "label": "Remembered care"
          },
          {
            "id": "B0",
            "label": "Value of care"
          },
          {
            "id": "B1",
            "label": "Anchor cue"
          },
          {
            "id": "B2",
            "label": "Honest description"
          },
          {
            "id": "B3",
            "label": "Uncertainty"
          },
          {
            "id": "B4",
            "label": "Language choice"
          },
          {
            "id": "B5",
            "label": "Permission to pause"
          },
          {
            "id": "B6",
            "label": "Provenance"
          },
          {
            "id": "B7",
            "label": "Context"
          },
          {
            "id": "B8",
            "label": "Revisability"
          },
          {
            "id": "B9",
            "label": "Relationship"
          }
        ],
        "relations": [
          {
            "id": "D01",
            "from": "A0",
            "to": "A1",
            "text": "Care intention guides heart attention.",
            "kind": "outer cycle"
          },
          {
            "id": "D02",
            "from": "A1",
            "to": "A2",
            "text": "Heart attention notices a felt response.",
            "kind": "outer cycle"
          },
          {
            "id": "D03",
            "from": "A2",
            "to": "A3",
            "text": "Felt response informs a meaning hypothesis.",
            "kind": "outer cycle"
          },
          {
            "id": "D04",
            "from": "A3",
            "to": "A4",
            "text": "Meaning hypothesis informs a gentle phrase.",
            "kind": "outer cycle"
          },
          {
            "id": "D05",
            "from": "A4",
            "to": "A5",
            "text": "Gentle phrase frames a practice choice.",
            "kind": "outer cycle"
          },
          {
            "id": "D06",
            "from": "A5",
            "to": "A6",
            "text": "Practice choice is documented in the session record.",
            "kind": "outer cycle"
          },
          {
            "id": "D07",
            "from": "A6",
            "to": "A7",
            "text": "Session record supplies material for later review.",
            "kind": "outer cycle"
          },
          {
            "id": "D08",
            "from": "A7",
            "to": "A8",
            "text": "Later review justifies a next intention.",
            "kind": "outer cycle"
          },
          {
            "id": "D09",
            "from": "A8",
            "to": "A9",
            "text": "Next intention selects remembered care.",
            "kind": "outer cycle"
          },
          {
            "id": "D10",
            "from": "A9",
            "to": "A0",
            "text": "Remembered care gives care intention its context.",
            "kind": "outer cycle"
          },
          {
            "id": "D11",
            "from": "B0",
            "to": "B2",
            "text": "Value of care asks for honest description.",
            "kind": "health cycle"
          },
          {
            "id": "D12",
            "from": "B2",
            "to": "B4",
            "text": "Honest description constrains language choice.",
            "kind": "health cycle"
          },
          {
            "id": "D13",
            "from": "B4",
            "to": "B6",
            "text": "Language choice preserves provenance.",
            "kind": "health cycle"
          },
          {
            "id": "D14",
            "from": "B6",
            "to": "B8",
            "text": "Provenance supports revisability.",
            "kind": "health cycle"
          },
          {
            "id": "D15",
            "from": "B8",
            "to": "B0",
            "text": "Revisability keeps the value of care open to clarification.",
            "kind": "health cycle"
          },
          {
            "id": "D16",
            "from": "B1",
            "to": "B3",
            "text": "Anchor cue does not eliminate uncertainty.",
            "kind": "governance cycle"
          },
          {
            "id": "D17",
            "from": "B3",
            "to": "B5",
            "text": "Uncertainty permits a pause.",
            "kind": "governance cycle"
          },
          {
            "id": "D18",
            "from": "B5",
            "to": "B7",
            "text": "Permission to pause is adapted to context.",
            "kind": "governance cycle"
          },
          {
            "id": "D19",
            "from": "B7",
            "to": "B9",
            "text": "Context frames recollection of a relationship.",
            "kind": "governance cycle"
          },
          {
            "id": "D20",
            "from": "B9",
            "to": "B1",
            "text": "Relationship gives the anchor cue its meaning.",
            "kind": "governance cycle"
          },
          {
            "id": "D21",
            "from": "A0",
            "to": "B0",
            "text": "Care intention expresses the value of care.",
            "kind": "bridges"
          },
          {
            "id": "D22",
            "from": "A1",
            "to": "B1",
            "text": "Heart attention uses an anchor cue.",
            "kind": "bridges"
          },
          {
            "id": "D23",
            "from": "A2",
            "to": "B2",
            "text": "Felt response limits what honest description can claim.",
            "kind": "bridges"
          },
          {
            "id": "D24",
            "from": "A3",
            "to": "B3",
            "text": "Meaning hypothesis retains uncertainty.",
            "kind": "bridges"
          },
          {
            "id": "D25",
            "from": "A4",
            "to": "B4",
            "text": "Gentle phrase uses a language choice.",
            "kind": "bridges"
          },
          {
            "id": "D26",
            "from": "A5",
            "to": "B5",
            "text": "Practice choice honours permission to pause.",
            "kind": "bridges"
          },
          {
            "id": "D27",
            "from": "A6",
            "to": "B6",
            "text": "Session record preserves provenance.",
            "kind": "bridges"
          },
          {
            "id": "D28",
            "from": "A7",
            "to": "B7",
            "text": "Later review reconsiders context.",
            "kind": "bridges"
          },
          {
            "id": "D29",
            "from": "A8",
            "to": "B8",
            "text": "Next intention remains subject to revisability.",
            "kind": "bridges"
          },
          {
            "id": "D30",
            "from": "A9",
            "to": "B9",
            "text": "Remembered care refers to a relationship.",
            "kind": "bridges"
          }
        ],
        "fourBreaths": [
          {
            "inhale": "Receive the full prepared model of care, attention, feeling and reflective practice.",
            "compare": "Seed the complete prepared model; there is no earlier entry.",
            "changes": []
          },
          {
            "inhale": "Later review cannot yet justify the next intention; retain the other 29 links.",
            "compare": "Retrieve entry 1: D08 changes from justified continuation to unresolved justification.",
            "changes": [
              {
                "relationId": "D08",
                "text": "Later review cannot yet justify a next intention."
              }
            ]
          },
          {
            "inhale": "Keep that uncertainty; revisability now reopens what the value of care means in this context.",
            "compare": "Retrieve entry 2: D15 changes from available clarification to active reconsideration; D08 remains unresolved.",
            "changes": [
              {
                "relationId": "D15",
                "text": "Revisability reopens the meaning of the value of care."
              }
            ]
          },
          {
            "inhale": "A considered review now justifies a next intention while clarification of care remains open.",
            "compare": "Retrieve entry 3: D08 is repaired in the constructed model; D15 remains open.",
            "changes": [
              {
                "relationId": "D08",
                "text": "Later review justifies a next intention."
              }
            ]
          }
        ]
      },
      "icosahedron": {
        "nodes": [
          {
            "id": "N",
            "label": "Practice intention"
          },
          {
            "id": "S",
            "label": "Attention budget"
          },
          {
            "id": "U0",
            "label": "Sincerity"
          },
          {
            "id": "U1",
            "label": "Gentleness"
          },
          {
            "id": "U2",
            "label": "Continuity"
          },
          {
            "id": "U3",
            "label": "Openness"
          },
          {
            "id": "U4",
            "label": "Revisability"
          },
          {
            "id": "L0",
            "label": "Care memory"
          },
          {
            "id": "L1",
            "label": "Felt response"
          },
          {
            "id": "L2",
            "label": "Heart attention"
          },
          {
            "id": "L3",
            "label": "Welcoming phrase"
          },
          {
            "id": "L4",
            "label": "Meaning hypothesis"
          }
        ],
        "relations": [
          {
            "id": "I01",
            "from": "N",
            "to": "U0",
            "text": "Practice intention asks for sincerity.",
            "kind": "brief to criteria"
          },
          {
            "id": "I02",
            "from": "N",
            "to": "U1",
            "text": "Practice intention asks for gentleness.",
            "kind": "brief to criteria"
          },
          {
            "id": "I03",
            "from": "N",
            "to": "U2",
            "text": "Practice intention asks for continuity.",
            "kind": "brief to criteria"
          },
          {
            "id": "I04",
            "from": "N",
            "to": "U3",
            "text": "Practice intention asks for openness.",
            "kind": "brief to criteria"
          },
          {
            "id": "I05",
            "from": "N",
            "to": "U4",
            "text": "Practice intention asks for revisability.",
            "kind": "brief to criteria"
          },
          {
            "id": "I06",
            "from": "S",
            "to": "L0",
            "text": "Attention budget allocates attention to care memory.",
            "kind": "budget to choices"
          },
          {
            "id": "I07",
            "from": "S",
            "to": "L1",
            "text": "Attention budget allocates attention to felt response.",
            "kind": "budget to choices"
          },
          {
            "id": "I08",
            "from": "S",
            "to": "L2",
            "text": "Attention budget allocates attention to heart attention.",
            "kind": "budget to choices"
          },
          {
            "id": "I09",
            "from": "S",
            "to": "L3",
            "text": "Attention budget allocates attention to a welcoming phrase.",
            "kind": "budget to choices"
          },
          {
            "id": "I10",
            "from": "S",
            "to": "L4",
            "text": "Attention budget allocates attention to a meaning hypothesis.",
            "kind": "budget to choices"
          },
          {
            "id": "I11",
            "from": "U0",
            "to": "U1",
            "text": "Sincerity constrains claims of gentleness.",
            "kind": "criteria cycle"
          },
          {
            "id": "I12",
            "from": "U1",
            "to": "U2",
            "text": "Gentleness limits the effort demanded by continuity.",
            "kind": "criteria cycle"
          },
          {
            "id": "I13",
            "from": "U2",
            "to": "U3",
            "text": "Continuity leaves room for openness.",
            "kind": "criteria cycle"
          },
          {
            "id": "I14",
            "from": "U3",
            "to": "U4",
            "text": "Openness allows revisability.",
            "kind": "criteria cycle"
          },
          {
            "id": "I15",
            "from": "U4",
            "to": "U0",
            "text": "Revisability protects sincerity.",
            "kind": "criteria cycle"
          },
          {
            "id": "I16",
            "from": "L0",
            "to": "L1",
            "text": "Care memory is experienced as evoking a felt response.",
            "kind": "design cycle"
          },
          {
            "id": "I17",
            "from": "L1",
            "to": "L2",
            "text": "Felt response becomes an object of heart attention.",
            "kind": "design cycle"
          },
          {
            "id": "I18",
            "from": "L2",
            "to": "L3",
            "text": "Heart attention gives context to a welcoming phrase.",
            "kind": "design cycle"
          },
          {
            "id": "I19",
            "from": "L3",
            "to": "L4",
            "text": "Welcoming phrase frames a meaning hypothesis.",
            "kind": "design cycle"
          },
          {
            "id": "I20",
            "from": "L4",
            "to": "L0",
            "text": "Meaning hypothesis interprets care memory.",
            "kind": "design cycle"
          },
          {
            "id": "I21",
            "from": "U0",
            "to": "L0",
            "text": "Sincerity limits claims made about care memory.",
            "kind": "criteria to choices"
          },
          {
            "id": "I22",
            "from": "U0",
            "to": "L4",
            "text": "Sincerity limits claims made by a meaning hypothesis.",
            "kind": "criteria to choices"
          },
          {
            "id": "I23",
            "from": "U1",
            "to": "L1",
            "text": "Gentleness forbids forcing a felt response.",
            "kind": "criteria to choices"
          },
          {
            "id": "I24",
            "from": "U1",
            "to": "L0",
            "text": "Gentleness limits how care memory is pursued.",
            "kind": "criteria to choices"
          },
          {
            "id": "I25",
            "from": "U2",
            "to": "L2",
            "text": "Continuity guides return to heart attention.",
            "kind": "criteria to choices"
          },
          {
            "id": "I26",
            "from": "U2",
            "to": "L1",
            "text": "Continuity allows fluctuations in felt response.",
            "kind": "criteria to choices"
          },
          {
            "id": "I27",
            "from": "U3",
            "to": "L3",
            "text": "Openness qualifies the welcome expressed by a phrase.",
            "kind": "criteria to choices"
          },
          {
            "id": "I28",
            "from": "U3",
            "to": "L2",
            "text": "Openness allows changing the focus of heart attention.",
            "kind": "criteria to choices"
          },
          {
            "id": "I29",
            "from": "U4",
            "to": "L4",
            "text": "Revisability applies to a meaning hypothesis.",
            "kind": "criteria to choices"
          },
          {
            "id": "I30",
            "from": "U4",
            "to": "L3",
            "text": "Revisability applies to a welcoming phrase.",
            "kind": "criteria to choices"
          }
        ],
        "fourBreaths": [
          {
            "inhale": "Receive the prepared model linking five practice aims to five contents of a heart-focused exercise.",
            "compare": "Seed the complete prepared model; there is no earlier entry.",
            "changes": []
          },
          {
            "inhale": "Attention is no longer allocated to the welcoming phrase; retain the other 29 links.",
            "compare": "Retrieve entry 1: I09 changes in attention allocation; this says nothing about heart physiology.",
            "changes": [
              {
                "relationId": "I09",
                "text": "Attention budget no longer allocates attention to a welcoming phrase."
              }
            ]
          },
          {
            "inhale": "Keep that allocation change; imagine care memory being pursued with pressure contrary to gentleness.",
            "compare": "Retrieve entry 2: I24 becomes a specific conflict between gentle practice and the manner of recall.",
            "changes": [
              {
                "relationId": "I24",
                "text": "Gentleness is violated by the pressured pursuit of care memory."
              }
            ]
          },
          {
            "inhale": "Imagine recall that permits mixed feelings without pressure; keep phrase attention unallocated.",
            "compare": "Retrieve entry 3: I24 is provisionally reconciled while the I09 allocation change remains.",
            "changes": [
              {
                "relationId": "I24",
                "text": "Gentleness is respected in the unforced pursuit of care memory."
              }
            ]
          }
        ]
      }
    },
    "body": {
      "dodecahedron": {
        "nodes": [
          {
            "id": "A0",
            "label": "Mapping intention"
          },
          {
            "id": "A1",
            "label": "Selected bodily episode"
          },
          {
            "id": "A2",
            "label": "Sensation description"
          },
          {
            "id": "A3",
            "label": "Provisional emotion name"
          },
          {
            "id": "A4",
            "label": "Meaning hypothesis"
          },
          {
            "id": "A5",
            "label": "Response option"
          },
          {
            "id": "A6",
            "label": "Episode ledger"
          },
          {
            "id": "A7",
            "label": "Comparison"
          },
          {
            "id": "A8",
            "label": "Revised map"
          },
          {
            "id": "A9",
            "label": "Next inquiry"
          },
          {
            "id": "B0",
            "label": "Clarity goal"
          },
          {
            "id": "B1",
            "label": "Attention cue"
          },
          {
            "id": "B2",
            "label": "Word choice"
          },
          {
            "id": "B3",
            "label": "Uncertainty"
          },
          {
            "id": "B4",
            "label": "Context"
          },
          {
            "id": "B5",
            "label": "Permission to pause"
          },
          {
            "id": "B6",
            "label": "Evidence boundary"
          },
          {
            "id": "B7",
            "label": "Alternative explanation"
          },
          {
            "id": "B8",
            "label": "Revisability"
          },
          {
            "id": "B9",
            "label": "Question"
          }
        ],
        "relations": [
          {
            "id": "D01",
            "from": "A0",
            "to": "A1",
            "text": "Mapping intention selects a bodily episode.",
            "kind": "outer cycle"
          },
          {
            "id": "D02",
            "from": "A1",
            "to": "A2",
            "text": "Selected bodily episode grounds sensation description.",
            "kind": "outer cycle"
          },
          {
            "id": "D03",
            "from": "A2",
            "to": "A3",
            "text": "Sensation description constrains a provisional emotion name.",
            "kind": "outer cycle"
          },
          {
            "id": "D04",
            "from": "A3",
            "to": "A4",
            "text": "Provisional emotion name frames a meaning hypothesis.",
            "kind": "outer cycle"
          },
          {
            "id": "D05",
            "from": "A4",
            "to": "A5",
            "text": "Meaning hypothesis suggests a response option.",
            "kind": "outer cycle"
          },
          {
            "id": "D06",
            "from": "A5",
            "to": "A6",
            "text": "Response option is distinguished from an action in the episode ledger.",
            "kind": "outer cycle"
          },
          {
            "id": "D07",
            "from": "A6",
            "to": "A7",
            "text": "Episode ledger supplies material for comparison.",
            "kind": "outer cycle"
          },
          {
            "id": "D08",
            "from": "A7",
            "to": "A8",
            "text": "Comparison supports revision of a map.",
            "kind": "outer cycle"
          },
          {
            "id": "D09",
            "from": "A8",
            "to": "A9",
            "text": "Revised map directs the next inquiry.",
            "kind": "outer cycle"
          },
          {
            "id": "D10",
            "from": "A9",
            "to": "A0",
            "text": "Next inquiry refines the mapping intention.",
            "kind": "outer cycle"
          },
          {
            "id": "D11",
            "from": "B0",
            "to": "B2",
            "text": "Clarity goal guides word choice.",
            "kind": "health cycle"
          },
          {
            "id": "D12",
            "from": "B2",
            "to": "B4",
            "text": "Word choice must remain faithful to context.",
            "kind": "health cycle"
          },
          {
            "id": "D13",
            "from": "B4",
            "to": "B6",
            "text": "Context constrains the evidence boundary.",
            "kind": "health cycle"
          },
          {
            "id": "D14",
            "from": "B6",
            "to": "B8",
            "text": "Evidence boundary preserves revisability.",
            "kind": "health cycle"
          },
          {
            "id": "D15",
            "from": "B8",
            "to": "B0",
            "text": "Revisability serves the clarity goal.",
            "kind": "health cycle"
          },
          {
            "id": "D16",
            "from": "B1",
            "to": "B3",
            "text": "Attention cue leaves room for uncertainty.",
            "kind": "governance cycle"
          },
          {
            "id": "D17",
            "from": "B3",
            "to": "B5",
            "text": "Uncertainty permits a pause.",
            "kind": "governance cycle"
          },
          {
            "id": "D18",
            "from": "B5",
            "to": "B7",
            "text": "Permission to pause allows reconsideration of an alternative explanation.",
            "kind": "governance cycle"
          },
          {
            "id": "D19",
            "from": "B7",
            "to": "B9",
            "text": "Alternative explanation motivates a question.",
            "kind": "governance cycle"
          },
          {
            "id": "D20",
            "from": "B9",
            "to": "B1",
            "text": "Question selects an attention cue.",
            "kind": "governance cycle"
          },
          {
            "id": "D21",
            "from": "A0",
            "to": "B0",
            "text": "Mapping intention serves a clarity goal.",
            "kind": "bridges"
          },
          {
            "id": "D22",
            "from": "A1",
            "to": "B1",
            "text": "Selected bodily episode can be recovered through an attention cue.",
            "kind": "bridges"
          },
          {
            "id": "D23",
            "from": "A2",
            "to": "B2",
            "text": "Sensation description uses a word choice.",
            "kind": "bridges"
          },
          {
            "id": "D24",
            "from": "A3",
            "to": "B3",
            "text": "Provisional emotion name retains uncertainty.",
            "kind": "bridges"
          },
          {
            "id": "D25",
            "from": "A4",
            "to": "B4",
            "text": "Meaning hypothesis depends on context.",
            "kind": "bridges"
          },
          {
            "id": "D26",
            "from": "A5",
            "to": "B5",
            "text": "Response option honours permission to pause.",
            "kind": "bridges"
          },
          {
            "id": "D27",
            "from": "A6",
            "to": "B6",
            "text": "Episode ledger states its evidence boundary.",
            "kind": "bridges"
          },
          {
            "id": "D28",
            "from": "A7",
            "to": "B7",
            "text": "Comparison tests an alternative explanation.",
            "kind": "bridges"
          },
          {
            "id": "D29",
            "from": "A8",
            "to": "B8",
            "text": "Revised map remains subject to revisability.",
            "kind": "bridges"
          },
          {
            "id": "D30",
            "from": "A9",
            "to": "B9",
            "text": "Next inquiry centres on a question.",
            "kind": "bridges"
          }
        ],
        "fourBreaths": [
          {
            "inhale": "Receive the full prepared model of a bodily episode, its description, interpretation and review.",
            "compare": "Seed the complete prepared model; there is no earlier entry.",
            "changes": []
          },
          {
            "inhale": "Comparison cannot yet justify a revised map; retain all other links.",
            "compare": "Retrieve entry 1: D08 becomes an unresolved inference, not a new bodily finding.",
            "changes": [
              {
                "relationId": "D08",
                "text": "Comparison cannot yet justify a revised map."
              }
            ]
          },
          {
            "inhale": "Keep D08 unresolved; recorded uncertainty does not justify the certainty claimed by the provisional emotion name.",
            "compare": "Retrieve entry 2: D24 changes from qualified naming to an identified overclaim; this does not establish that the label is false.",
            "changes": [
              {
                "relationId": "D24",
                "text": "Provisional emotion name exceeds what the recorded uncertainty permits."
              }
            ]
          },
          {
            "inhale": "A narrower comparison supports revising the map; retain the warning about the emotion name.",
            "compare": "Retrieve entry 3: D08 becomes supported within the construction, while D24 remains an overclaim.",
            "changes": [
              {
                "relationId": "D08",
                "text": "Comparison supports revision of a map."
              }
            ]
          }
        ]
      },
      "icosahedron": {
        "nodes": [
          {
            "id": "N",
            "label": "Mapping intention"
          },
          {
            "id": "S",
            "label": "Attention budget"
          },
          {
            "id": "U0",
            "label": "Specificity"
          },
          {
            "id": "U1",
            "label": "Uncertainty"
          },
          {
            "id": "U2",
            "label": "Layer coherence"
          },
          {
            "id": "U3",
            "label": "Contextual fit"
          },
          {
            "id": "U4",
            "label": "Revisability"
          },
          {
            "id": "L0",
            "label": "Sensation record"
          },
          {
            "id": "L1",
            "label": "Image record"
          },
          {
            "id": "L2",
            "label": "Impulse record"
          },
          {
            "id": "L3",
            "label": "Emotion label"
          },
          {
            "id": "L4",
            "label": "Meaning hypothesis"
          }
        ],
        "relations": [
          {
            "id": "I01",
            "from": "N",
            "to": "U0",
            "text": "Mapping intention asks for specificity.",
            "kind": "brief to criteria"
          },
          {
            "id": "I02",
            "from": "N",
            "to": "U1",
            "text": "Mapping intention preserves uncertainty.",
            "kind": "brief to criteria"
          },
          {
            "id": "I03",
            "from": "N",
            "to": "U2",
            "text": "Mapping intention examines layer coherence.",
            "kind": "brief to criteria"
          },
          {
            "id": "I04",
            "from": "N",
            "to": "U3",
            "text": "Mapping intention tests contextual fit.",
            "kind": "brief to criteria"
          },
          {
            "id": "I05",
            "from": "N",
            "to": "U4",
            "text": "Mapping intention preserves revisability.",
            "kind": "brief to criteria"
          },
          {
            "id": "I06",
            "from": "S",
            "to": "L0",
            "text": "Attention budget allocates attention to sensation record.",
            "kind": "budget to choices"
          },
          {
            "id": "I07",
            "from": "S",
            "to": "L1",
            "text": "Attention budget allocates attention to image record.",
            "kind": "budget to choices"
          },
          {
            "id": "I08",
            "from": "S",
            "to": "L2",
            "text": "Attention budget allocates attention to impulse record.",
            "kind": "budget to choices"
          },
          {
            "id": "I09",
            "from": "S",
            "to": "L3",
            "text": "Attention budget allocates attention to emotion label.",
            "kind": "budget to choices"
          },
          {
            "id": "I10",
            "from": "S",
            "to": "L4",
            "text": "Attention budget allocates attention to meaning hypothesis.",
            "kind": "budget to choices"
          },
          {
            "id": "I11",
            "from": "U0",
            "to": "U1",
            "text": "Specificity makes uncertainty precise.",
            "kind": "criteria cycle"
          },
          {
            "id": "I12",
            "from": "U1",
            "to": "U2",
            "text": "Uncertainty qualifies claims of layer coherence.",
            "kind": "criteria cycle"
          },
          {
            "id": "I13",
            "from": "U2",
            "to": "U3",
            "text": "Layer coherence must be interpreted with contextual fit.",
            "kind": "criteria cycle"
          },
          {
            "id": "I14",
            "from": "U3",
            "to": "U4",
            "text": "Contextual fit guides revisability.",
            "kind": "criteria cycle"
          },
          {
            "id": "I15",
            "from": "U4",
            "to": "U0",
            "text": "Revisability preserves specificity.",
            "kind": "criteria cycle"
          },
          {
            "id": "I16",
            "from": "L0",
            "to": "L1",
            "text": "Sensation record can cue an image record in this constructed episode.",
            "kind": "design cycle"
          },
          {
            "id": "I17",
            "from": "L1",
            "to": "L2",
            "text": "Image record accompanies an impulse record in this constructed episode.",
            "kind": "design cycle"
          },
          {
            "id": "I18",
            "from": "L2",
            "to": "L3",
            "text": "Impulse record informs a provisional emotion label.",
            "kind": "design cycle"
          },
          {
            "id": "I19",
            "from": "L3",
            "to": "L4",
            "text": "Emotion label frames a meaning hypothesis.",
            "kind": "design cycle"
          },
          {
            "id": "I20",
            "from": "L4",
            "to": "L0",
            "text": "Meaning hypothesis interprets the sensation record.",
            "kind": "design cycle"
          },
          {
            "id": "I21",
            "from": "U0",
            "to": "L0",
            "text": "Specificity constrains the sensation record.",
            "kind": "criteria to choices"
          },
          {
            "id": "I22",
            "from": "U0",
            "to": "L4",
            "text": "Specificity constrains the meaning hypothesis.",
            "kind": "criteria to choices"
          },
          {
            "id": "I23",
            "from": "U1",
            "to": "L1",
            "text": "Uncertainty qualifies the image record.",
            "kind": "criteria to choices"
          },
          {
            "id": "I24",
            "from": "U1",
            "to": "L0",
            "text": "Uncertainty qualifies the sensation record.",
            "kind": "criteria to choices"
          },
          {
            "id": "I25",
            "from": "U2",
            "to": "L2",
            "text": "Layer coherence compares the impulse record with other recorded layers.",
            "kind": "criteria to choices"
          },
          {
            "id": "I26",
            "from": "U2",
            "to": "L1",
            "text": "Layer coherence compares the image record with other recorded layers.",
            "kind": "criteria to choices"
          },
          {
            "id": "I27",
            "from": "U3",
            "to": "L3",
            "text": "Contextual fit constrains the emotion label.",
            "kind": "criteria to choices"
          },
          {
            "id": "I28",
            "from": "U3",
            "to": "L2",
            "text": "Contextual fit constrains interpretation of the impulse record.",
            "kind": "criteria to choices"
          },
          {
            "id": "I29",
            "from": "U4",
            "to": "L4",
            "text": "Revisability applies to the meaning hypothesis.",
            "kind": "criteria to choices"
          },
          {
            "id": "I30",
            "from": "U4",
            "to": "L3",
            "text": "Revisability applies to the emotion label.",
            "kind": "criteria to choices"
          }
        ],
        "fourBreaths": [
          {
            "inhale": "Receive the prepared model linking mapping aims to sensation, image, impulse, label and interpretation records.",
            "compare": "Seed the complete prepared model; there is no earlier entry.",
            "changes": []
          },
          {
            "inhale": "Attention is no longer allocated to the emotion label; retain the other 29 links.",
            "compare": "Retrieve entry 1: I09 changes an allocation, not the content of a sensation.",
            "changes": [
              {
                "relationId": "I09",
                "text": "Attention budget no longer allocates attention to the emotion label."
              }
            ]
          },
          {
            "inhale": "Keep the allocation change; imagine the sensation record claiming more certainty than available.",
            "compare": "Retrieve entry 2: I24 identifies a mismatch between uncertainty and the recorded claim.",
            "changes": [
              {
                "relationId": "I24",
                "text": "Uncertainty conflicts with the certainty claimed by the sensation record."
              }
            ]
          },
          {
            "inhale": "Qualify the sensation record accurately; leave the label allocation unchanged.",
            "compare": "Retrieve entry 3: I24 is reconciled without inventing a bodily change.",
            "changes": [
              {
                "relationId": "I24",
                "text": "Uncertainty is accurately reflected in the qualified sensation record."
              }
            ]
          }
        ]
      }
    }
  },
  "mediators": {
    "stream": [
      {
        "id": "M01",
        "label": "safety commitment",
        "first": "Service brief states safety commitment.",
        "second": "Safety commitment defines the target for safety."
      },
      {
        "id": "M02",
        "label": "access commitment",
        "first": "Service brief states access commitment.",
        "second": "Access commitment defines the target for accessibility."
      },
      {
        "id": "M03",
        "label": "service reliability target",
        "first": "Service brief states service reliability target.",
        "second": "Service reliability target defines the target for reliability."
      },
      {
        "id": "M04",
        "label": "affordability commitment",
        "first": "Service brief states affordability commitment.",
        "second": "Affordability commitment defines the target for affordability."
      },
      {
        "id": "M05",
        "label": "environmental commitment",
        "first": "Service brief states environmental commitment.",
        "second": "Environmental commitment defines the target for ecological impact."
      },
      {
        "id": "M06",
        "label": "vessel capital allocation",
        "first": "Budget provides vessel capital allocation.",
        "second": "Vessel capital allocation funds the implementation of vessel design."
      },
      {
        "id": "M07",
        "label": "terminal capital allocation",
        "first": "Budget provides terminal capital allocation.",
        "second": "Terminal capital allocation funds the implementation of terminal design."
      },
      {
        "id": "M08",
        "label": "operating allocation",
        "first": "Budget provides operating allocation.",
        "second": "Operating allocation funds the operation of timetable."
      },
      {
        "id": "M09",
        "label": "fare subsidy",
        "first": "Budget provides fare subsidy.",
        "second": "Fare subsidy reduces the amount recovered through fares."
      },
      {
        "id": "M10",
        "label": "energy investment",
        "first": "Budget provides energy investment.",
        "second": "Energy investment funds the implementation of propulsion."
      },
      {
        "id": "M11",
        "label": "safe-access rule",
        "first": "Safety grounds safe-access rule.",
        "second": "Safe-access rule constrains the implementation of accessibility."
      },
      {
        "id": "M12",
        "label": "boarding-time assumption",
        "first": "Accessibility informs boarding-time assumption.",
        "second": "Boarding-time assumption affects the assessment of reliability."
      },
      {
        "id": "M13",
        "label": "service-cost model",
        "first": "Reliability sets service requirements in service-cost model.",
        "second": "Service-cost model bounds the assessment of affordability."
      },
      {
        "id": "M14",
        "label": "mode-shift hypothesis",
        "first": "Affordability is an input to mode-shift hypothesis.",
        "second": "Mode-shift hypothesis predicts a change in ecological impact."
      },
      {
        "id": "M15",
        "label": "environmental safety review",
        "first": "Ecological impact triggers environmental safety review.",
        "second": "Environmental safety review checks conformity with safety."
      },
      {
        "id": "M16",
        "label": "berth interface specification",
        "first": "Vessel design sets requirements in berth interface specification.",
        "second": "Berth interface specification constrains terminal design."
      },
      {
        "id": "M17",
        "label": "turnaround allowance",
        "first": "Terminal design determines turnaround allowance.",
        "second": "Turnaround allowance constrains timetable."
      },
      {
        "id": "M18",
        "label": "cost-recovery formula",
        "first": "Timetable contributes operating costs to cost-recovery formula.",
        "second": "Cost-recovery formula helps determine fares."
      },
      {
        "id": "M19",
        "label": "energy fund",
        "first": "Fares provide revenue to energy fund.",
        "second": "Energy fund finances propulsion."
      },
      {
        "id": "M20",
        "label": "power-system integration plan",
        "first": "Propulsion sets requirements in power-system integration plan.",
        "second": "Power-system integration plan constrains vessel design."
      },
      {
        "id": "M21",
        "label": "stability standard",
        "first": "Safety sets the purpose of stability standard.",
        "second": "Stability standard constrains vessel design."
      },
      {
        "id": "M22",
        "label": "propulsion safety standard",
        "first": "Safety sets the purpose of propulsion safety standard.",
        "second": "Propulsion safety standard constrains propulsion."
      },
      {
        "id": "M23",
        "label": "terminal access standard",
        "first": "Accessibility sets the purpose of terminal access standard.",
        "second": "Terminal access standard constrains terminal design."
      },
      {
        "id": "M24",
        "label": "boarding standard",
        "first": "Accessibility sets the purpose of boarding standard.",
        "second": "Boarding standard constrains vessel design."
      },
      {
        "id": "M25",
        "label": "service interval rule",
        "first": "Reliability sets the purpose of service interval rule.",
        "second": "Service interval rule constrains timetable."
      },
      {
        "id": "M26",
        "label": "terminal turnaround standard",
        "first": "Reliability sets the purpose of terminal turnaround standard.",
        "second": "Terminal turnaround standard constrains terminal design."
      },
      {
        "id": "M27",
        "label": "fare ceiling",
        "first": "Affordability sets the purpose of fare ceiling.",
        "second": "Fare ceiling constrains fares."
      },
      {
        "id": "M28",
        "label": "affordable-service specification",
        "first": "Affordability sets the purpose of affordable-service specification.",
        "second": "Affordable-service specification constrains timetable."
      },
      {
        "id": "M29",
        "label": "emissions standard",
        "first": "Ecological impact sets the purpose of emissions standard.",
        "second": "Emissions standard constrains propulsion."
      },
      {
        "id": "M30",
        "label": "mode-shift fare incentive",
        "first": "Ecological impact sets the purpose of mode-shift fare incentive.",
        "second": "Mode-shift fare incentive constrains fares."
      }
    ],
    "heart": [
      {
        "id": "M01",
        "label": "Honesty commitment",
        "first": "Practice intention includes an honesty commitment.",
        "second": "Honesty commitment gives sincerity its stated scope."
      },
      {
        "id": "M02",
        "label": "Permission for ease",
        "first": "Practice intention includes permission for ease.",
        "second": "Permission for ease defines gentleness for this practice."
      },
      {
        "id": "M03",
        "label": "Return commitment",
        "first": "Practice intention includes a return commitment.",
        "second": "Return commitment defines continuity as returning rather than never wandering."
      },
      {
        "id": "M04",
        "label": "Welcome commitment",
        "first": "Practice intention includes a welcome commitment.",
        "second": "Welcome commitment defines openness to the response actually present."
      },
      {
        "id": "M05",
        "label": "Revision commitment",
        "first": "Practice intention includes a revision commitment.",
        "second": "Revision commitment makes revisability explicit."
      },
      {
        "id": "M06",
        "label": "Memory attention allocation",
        "first": "Attention budget provides a memory attention allocation.",
        "second": "Memory attention allocation supports attending to care memory."
      },
      {
        "id": "M07",
        "label": "Feeling attention allocation",
        "first": "Attention budget provides a feeling attention allocation.",
        "second": "Feeling attention allocation supports attending to felt response."
      },
      {
        "id": "M08",
        "label": "Anchor attention allocation",
        "first": "Attention budget provides an anchor attention allocation.",
        "second": "Anchor attention allocation supports heart attention."
      },
      {
        "id": "M09",
        "label": "Phrase attention allocation",
        "first": "Attention budget provides a phrase attention allocation.",
        "second": "Phrase attention allocation supports attending to a welcoming phrase."
      },
      {
        "id": "M10",
        "label": "Meaning attention allocation",
        "first": "Attention budget provides a meaning attention allocation.",
        "second": "Meaning attention allocation supports attending to a meaning hypothesis."
      },
      {
        "id": "M11",
        "label": "Honest ease check",
        "first": "Sincerity supplies an honest ease check.",
        "second": "Honest ease check tests claims of gentleness."
      },
      {
        "id": "M12",
        "label": "Unforced return rule",
        "first": "Gentleness supplies an unforced return rule.",
        "second": "Unforced return rule limits effort demanded by continuity."
      },
      {
        "id": "M13",
        "label": "Flexible anchor rule",
        "first": "Continuity uses a flexible anchor rule.",
        "second": "Flexible anchor rule preserves openness."
      },
      {
        "id": "M14",
        "label": "Reconsideration permission",
        "first": "Openness includes reconsideration permission.",
        "second": "Reconsideration permission enables revisability."
      },
      {
        "id": "M15",
        "label": "Claim correction rule",
        "first": "Revisability supplies a claim correction rule.",
        "second": "Claim correction rule protects sincerity."
      },
      {
        "id": "M16",
        "label": "Remembered meaning",
        "first": "Care memory supplies remembered meaning.",
        "second": "Remembered meaning is experienced as evoking felt response in this construction."
      },
      {
        "id": "M17",
        "label": "Feeling anchor cue",
        "first": "Felt response supplies a feeling anchor cue.",
        "second": "Feeling anchor cue can orient heart attention."
      },
      {
        "id": "M18",
        "label": "Situated welcome",
        "first": "Heart attention supplies a context for situated welcome.",
        "second": "Situated welcome gives the welcoming phrase its context."
      },
      {
        "id": "M19",
        "label": "Interpretive wording",
        "first": "Welcoming phrase supplies interpretive wording.",
        "second": "Interpretive wording frames the meaning hypothesis."
      },
      {
        "id": "M20",
        "label": "Memory interpretation",
        "first": "Meaning hypothesis supplies a memory interpretation.",
        "second": "Memory interpretation gives a provisional account of care memory."
      },
      {
        "id": "M21",
        "label": "Memory honesty rule",
        "first": "Sincerity establishes a memory honesty rule.",
        "second": "Memory honesty rule limits claims about care memory."
      },
      {
        "id": "M22",
        "label": "Hypothesis qualification",
        "first": "Sincerity establishes hypothesis qualification.",
        "second": "Hypothesis qualification limits claims made by a meaning hypothesis."
      },
      {
        "id": "M23",
        "label": "No-forcing rule",
        "first": "Gentleness establishes a no-forcing rule.",
        "second": "No-forcing rule does not demand a particular felt response."
      },
      {
        "id": "M24",
        "label": "Gentle recall rule",
        "first": "Gentleness establishes a gentle recall rule.",
        "second": "Gentle recall rule limits how care memory is pursued."
      },
      {
        "id": "M25",
        "label": "Return cue",
        "first": "Continuity establishes a return cue.",
        "second": "Return cue guides return to heart attention."
      },
      {
        "id": "M26",
        "label": "Fluctuation allowance",
        "first": "Continuity includes a fluctuation allowance.",
        "second": "Fluctuation allowance permits variation in felt response."
      },
      {
        "id": "M27",
        "label": "Inclusive phrase rule",
        "first": "Openness establishes an inclusive phrase rule.",
        "second": "Inclusive phrase rule qualifies the welcoming phrase."
      },
      {
        "id": "M28",
        "label": "Flexible attention rule",
        "first": "Openness establishes a flexible attention rule.",
        "second": "Flexible attention rule permits changing heart attention."
      },
      {
        "id": "M29",
        "label": "Hypothesis review",
        "first": "Revisability establishes hypothesis review.",
        "second": "Hypothesis review reconsiders the meaning hypothesis."
      },
      {
        "id": "M30",
        "label": "Phrase review",
        "first": "Revisability establishes phrase review.",
        "second": "Phrase review reconsiders the welcoming phrase."
      }
    ],
    "body": [
      {
        "id": "M01",
        "label": "Specificity commitment",
        "first": "Mapping intention includes a specificity commitment.",
        "second": "Specificity commitment defines the scope of specificity."
      },
      {
        "id": "M02",
        "label": "Uncertainty commitment",
        "first": "Mapping intention includes an uncertainty commitment.",
        "second": "Uncertainty commitment preserves uncertainty."
      },
      {
        "id": "M03",
        "label": "Layer comparison plan",
        "first": "Mapping intention includes a layer comparison plan.",
        "second": "Layer comparison plan gives layer coherence its limited meaning."
      },
      {
        "id": "M04",
        "label": "Context check plan",
        "first": "Mapping intention includes a context check plan.",
        "second": "Context check plan tests contextual fit."
      },
      {
        "id": "M05",
        "label": "Revision commitment",
        "first": "Mapping intention includes a revision commitment.",
        "second": "Revision commitment preserves revisability."
      },
      {
        "id": "M06",
        "label": "Sensation allocation",
        "first": "Attention budget supplies a sensation allocation.",
        "second": "Sensation allocation supports attending to the sensation record."
      },
      {
        "id": "M07",
        "label": "Image allocation",
        "first": "Attention budget supplies an image allocation.",
        "second": "Image allocation supports attending to the image record."
      },
      {
        "id": "M08",
        "label": "Impulse allocation",
        "first": "Attention budget supplies an impulse allocation.",
        "second": "Impulse allocation supports attending to the impulse record."
      },
      {
        "id": "M09",
        "label": "Label allocation",
        "first": "Attention budget supplies a label allocation.",
        "second": "Label allocation supports attending to the emotion label."
      },
      {
        "id": "M10",
        "label": "Meaning allocation",
        "first": "Attention budget supplies a meaning allocation.",
        "second": "Meaning allocation supports attending to the meaning hypothesis."
      },
      {
        "id": "M11",
        "label": "Qualified wording rule",
        "first": "Specificity supplies a qualified wording rule.",
        "second": "Qualified wording rule locates uncertainty precisely."
      },
      {
        "id": "M12",
        "label": "Coherence qualification",
        "first": "Uncertainty supplies coherence qualification.",
        "second": "Coherence qualification limits claims of layer coherence."
      },
      {
        "id": "M13",
        "label": "Situated layer check",
        "first": "Layer coherence is assessed through a situated layer check.",
        "second": "Situated layer check examines contextual fit."
      },
      {
        "id": "M14",
        "label": "Context revision criterion",
        "first": "Contextual fit supplies a context revision criterion.",
        "second": "Context revision criterion guides revisability."
      },
      {
        "id": "M15",
        "label": "Precise revision rule",
        "first": "Revisability supplies a precise revision rule.",
        "second": "Precise revision rule preserves specificity."
      },
      {
        "id": "M16",
        "label": "Imagery association",
        "first": "Sensation record supports an imagery association in this construction.",
        "second": "Imagery association points to the image record without establishing causation."
      },
      {
        "id": "M17",
        "label": "Image impulse association",
        "first": "Image record supplies an image impulse association.",
        "second": "Image impulse association notes coexistence with the impulse record."
      },
      {
        "id": "M18",
        "label": "Impulse label hypothesis",
        "first": "Impulse record informs an impulse label hypothesis.",
        "second": "Impulse label hypothesis proposes an emotion label without establishing it."
      },
      {
        "id": "M19",
        "label": "Label interpretation",
        "first": "Emotion label supplies a label interpretation.",
        "second": "Label interpretation frames the meaning hypothesis."
      },
      {
        "id": "M20",
        "label": "Sensation interpretation",
        "first": "Meaning hypothesis supplies a sensation interpretation.",
        "second": "Sensation interpretation gives a provisional account of the sensation record."
      },
      {
        "id": "M21",
        "label": "Descriptive precision rule",
        "first": "Specificity supplies a descriptive precision rule.",
        "second": "Descriptive precision rule constrains the sensation record."
      },
      {
        "id": "M22",
        "label": "Hypothesis precision rule",
        "first": "Specificity supplies a hypothesis precision rule.",
        "second": "Hypothesis precision rule constrains the meaning hypothesis."
      },
      {
        "id": "M23",
        "label": "Image uncertainty marker",
        "first": "Uncertainty supplies an image uncertainty marker.",
        "second": "Image uncertainty marker qualifies the image record."
      },
      {
        "id": "M24",
        "label": "Sensation uncertainty marker",
        "first": "Uncertainty supplies a sensation uncertainty marker.",
        "second": "Sensation uncertainty marker qualifies the sensation record."
      },
      {
        "id": "M25",
        "label": "Impulse comparison rule",
        "first": "Layer coherence supplies an impulse comparison rule.",
        "second": "Impulse comparison rule compares the impulse record with the other recorded layers."
      },
      {
        "id": "M26",
        "label": "Image comparison rule",
        "first": "Layer coherence supplies an image comparison rule.",
        "second": "Image comparison rule compares the image record with the other recorded layers."
      },
      {
        "id": "M27",
        "label": "Situated label rule",
        "first": "Contextual fit supplies a situated label rule.",
        "second": "Situated label rule constrains the emotion label."
      },
      {
        "id": "M28",
        "label": "Situated impulse rule",
        "first": "Contextual fit supplies a situated impulse rule.",
        "second": "Situated impulse rule constrains interpretation of the impulse record."
      },
      {
        "id": "M29",
        "label": "Meaning review",
        "first": "Revisability supplies meaning review.",
        "second": "Meaning review reconsiders the meaning hypothesis."
      },
      {
        "id": "M30",
        "label": "Label review",
        "first": "Revisability supplies label review.",
        "second": "Label review reconsiders the emotion label."
      }
    ]
  },
  "originalFaces": [
    {
      "id": "F01",
      "nodes": [
        "L0",
        "L1",
        "S"
      ],
      "edges": [
        "I16",
        "I06",
        "I07"
      ]
    },
    {
      "id": "F02",
      "nodes": [
        "L0",
        "L1",
        "U1"
      ],
      "edges": [
        "I16",
        "I24",
        "I23"
      ]
    },
    {
      "id": "F03",
      "nodes": [
        "L0",
        "L4",
        "S"
      ],
      "edges": [
        "I20",
        "I06",
        "I10"
      ]
    },
    {
      "id": "F04",
      "nodes": [
        "L0",
        "L4",
        "U0"
      ],
      "edges": [
        "I20",
        "I21",
        "I22"
      ]
    },
    {
      "id": "F05",
      "nodes": [
        "L0",
        "U0",
        "U1"
      ],
      "edges": [
        "I21",
        "I24",
        "I11"
      ]
    },
    {
      "id": "F06",
      "nodes": [
        "L1",
        "L2",
        "S"
      ],
      "edges": [
        "I17",
        "I07",
        "I08"
      ]
    },
    {
      "id": "F07",
      "nodes": [
        "L1",
        "L2",
        "U2"
      ],
      "edges": [
        "I17",
        "I26",
        "I25"
      ]
    },
    {
      "id": "F08",
      "nodes": [
        "L1",
        "U1",
        "U2"
      ],
      "edges": [
        "I23",
        "I26",
        "I12"
      ]
    },
    {
      "id": "F09",
      "nodes": [
        "L2",
        "L3",
        "S"
      ],
      "edges": [
        "I18",
        "I08",
        "I09"
      ]
    },
    {
      "id": "F10",
      "nodes": [
        "L2",
        "L3",
        "U3"
      ],
      "edges": [
        "I18",
        "I28",
        "I27"
      ]
    },
    {
      "id": "F11",
      "nodes": [
        "L2",
        "U2",
        "U3"
      ],
      "edges": [
        "I25",
        "I28",
        "I13"
      ]
    },
    {
      "id": "F12",
      "nodes": [
        "L3",
        "L4",
        "S"
      ],
      "edges": [
        "I19",
        "I09",
        "I10"
      ]
    },
    {
      "id": "F13",
      "nodes": [
        "L3",
        "L4",
        "U4"
      ],
      "edges": [
        "I19",
        "I30",
        "I29"
      ]
    },
    {
      "id": "F14",
      "nodes": [
        "L3",
        "U3",
        "U4"
      ],
      "edges": [
        "I27",
        "I30",
        "I14"
      ]
    },
    {
      "id": "F15",
      "nodes": [
        "L4",
        "U0",
        "U4"
      ],
      "edges": [
        "I22",
        "I29",
        "I15"
      ]
    },
    {
      "id": "F16",
      "nodes": [
        "N",
        "U0",
        "U1"
      ],
      "edges": [
        "I01",
        "I02",
        "I11"
      ]
    },
    {
      "id": "F17",
      "nodes": [
        "N",
        "U0",
        "U4"
      ],
      "edges": [
        "I01",
        "I05",
        "I15"
      ]
    },
    {
      "id": "F18",
      "nodes": [
        "N",
        "U1",
        "U2"
      ],
      "edges": [
        "I02",
        "I03",
        "I12"
      ]
    },
    {
      "id": "F19",
      "nodes": [
        "N",
        "U2",
        "U3"
      ],
      "edges": [
        "I03",
        "I04",
        "I13"
      ]
    },
    {
      "id": "F20",
      "nodes": [
        "N",
        "U3",
        "U4"
      ],
      "edges": [
        "I04",
        "I05",
        "I14"
      ]
    }
  ],
  "compatibility": [
    {
      "id": "C01",
      "source": "M16",
      "predicate": "is required to remain compatible with",
      "target": "M06",
      "face": "F01",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "berth interface specification is required to remain compatible with vessel capital allocation"
    },
    {
      "id": "C02",
      "source": "M16",
      "predicate": "is required to remain compatible with",
      "target": "M07",
      "face": "F01",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "berth interface specification is required to remain compatible with terminal capital allocation"
    },
    {
      "id": "C03",
      "source": "M06",
      "predicate": "is required to remain compatible with",
      "target": "M07",
      "face": "F01",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "vessel capital allocation is required to remain compatible with terminal capital allocation"
    },
    {
      "id": "C04",
      "source": "M16",
      "predicate": "is required to remain compatible with",
      "target": "M24",
      "face": "F02",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "berth interface specification is required to remain compatible with boarding standard"
    },
    {
      "id": "C05",
      "source": "M16",
      "predicate": "is required to remain compatible with",
      "target": "M23",
      "face": "F02",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "berth interface specification is required to remain compatible with terminal access standard"
    },
    {
      "id": "C06",
      "source": "M24",
      "predicate": "is required to remain compatible with",
      "target": "M23",
      "face": "F02",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "boarding standard is required to remain compatible with terminal access standard"
    },
    {
      "id": "C07",
      "source": "M20",
      "predicate": "is required to remain compatible with",
      "target": "M06",
      "face": "F03",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "power-system integration plan is required to remain compatible with vessel capital allocation"
    },
    {
      "id": "C08",
      "source": "M20",
      "predicate": "is required to remain compatible with",
      "target": "M10",
      "face": "F03",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "power-system integration plan is required to remain compatible with energy investment"
    },
    {
      "id": "C09",
      "source": "M06",
      "predicate": "is required to remain compatible with",
      "target": "M10",
      "face": "F03",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "vessel capital allocation is required to remain compatible with energy investment"
    },
    {
      "id": "C10",
      "source": "M20",
      "predicate": "is required to remain compatible with",
      "target": "M21",
      "face": "F04",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "power-system integration plan is required to remain compatible with stability standard"
    },
    {
      "id": "C11",
      "source": "M20",
      "predicate": "is required to remain compatible with",
      "target": "M22",
      "face": "F04",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "power-system integration plan is required to remain compatible with propulsion safety standard"
    },
    {
      "id": "C12",
      "source": "M21",
      "predicate": "is required to remain compatible with",
      "target": "M22",
      "face": "F04",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "stability standard is required to remain compatible with propulsion safety standard"
    },
    {
      "id": "C13",
      "source": "M21",
      "predicate": "is required to remain compatible with",
      "target": "M24",
      "face": "F05",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "stability standard is required to remain compatible with boarding standard"
    },
    {
      "id": "C14",
      "source": "M21",
      "predicate": "is required to remain compatible with",
      "target": "M11",
      "face": "F05",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "stability standard is required to remain compatible with safe-access rule"
    },
    {
      "id": "C15",
      "source": "M24",
      "predicate": "is required to remain compatible with",
      "target": "M11",
      "face": "F05",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "boarding standard is required to remain compatible with safe-access rule"
    },
    {
      "id": "C16",
      "source": "M17",
      "predicate": "is required to remain compatible with",
      "target": "M07",
      "face": "F06",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "turnaround allowance is required to remain compatible with terminal capital allocation"
    },
    {
      "id": "C17",
      "source": "M17",
      "predicate": "is required to remain compatible with",
      "target": "M08",
      "face": "F06",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "turnaround allowance is required to remain compatible with operating allocation"
    },
    {
      "id": "C18",
      "source": "M07",
      "predicate": "is required to remain compatible with",
      "target": "M08",
      "face": "F06",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "terminal capital allocation is required to remain compatible with operating allocation"
    },
    {
      "id": "C19",
      "source": "M17",
      "predicate": "is required to remain compatible with",
      "target": "M26",
      "face": "F07",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "turnaround allowance is required to remain compatible with terminal turnaround standard"
    },
    {
      "id": "C20",
      "source": "M17",
      "predicate": "is required to remain compatible with",
      "target": "M25",
      "face": "F07",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "turnaround allowance is required to remain compatible with service interval rule"
    },
    {
      "id": "C21",
      "source": "M26",
      "predicate": "is required to remain compatible with",
      "target": "M25",
      "face": "F07",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "terminal turnaround standard is required to remain compatible with service interval rule"
    },
    {
      "id": "C22",
      "source": "M23",
      "predicate": "is required to remain compatible with",
      "target": "M26",
      "face": "F08",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "terminal access standard is required to remain compatible with terminal turnaround standard"
    },
    {
      "id": "C23",
      "source": "M23",
      "predicate": "is required to remain compatible with",
      "target": "M12",
      "face": "F08",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "terminal access standard is required to remain compatible with boarding-time assumption"
    },
    {
      "id": "C24",
      "source": "M26",
      "predicate": "is required to remain compatible with",
      "target": "M12",
      "face": "F08",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "terminal turnaround standard is required to remain compatible with boarding-time assumption"
    },
    {
      "id": "C25",
      "source": "M18",
      "predicate": "is required to remain compatible with",
      "target": "M08",
      "face": "F09",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "cost-recovery formula is required to remain compatible with operating allocation"
    },
    {
      "id": "C26",
      "source": "M18",
      "predicate": "is required to remain compatible with",
      "target": "M09",
      "face": "F09",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "cost-recovery formula is required to remain compatible with fare subsidy"
    },
    {
      "id": "C27",
      "source": "M08",
      "predicate": "is required to remain compatible with",
      "target": "M09",
      "face": "F09",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "operating allocation is required to remain compatible with fare subsidy"
    },
    {
      "id": "C28",
      "source": "M18",
      "predicate": "is required to remain compatible with",
      "target": "M28",
      "face": "F10",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "cost-recovery formula is required to remain compatible with affordable-service specification"
    },
    {
      "id": "C29",
      "source": "M18",
      "predicate": "is required to remain compatible with",
      "target": "M27",
      "face": "F10",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "cost-recovery formula is required to remain compatible with fare ceiling"
    },
    {
      "id": "C30",
      "source": "M28",
      "predicate": "is required to remain compatible with",
      "target": "M27",
      "face": "F10",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "affordable-service specification is required to remain compatible with fare ceiling"
    },
    {
      "id": "C31",
      "source": "M25",
      "predicate": "is required to remain compatible with",
      "target": "M28",
      "face": "F11",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "service interval rule is required to remain compatible with affordable-service specification"
    },
    {
      "id": "C32",
      "source": "M25",
      "predicate": "is required to remain compatible with",
      "target": "M13",
      "face": "F11",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "service interval rule is required to remain compatible with service-cost model"
    },
    {
      "id": "C33",
      "source": "M28",
      "predicate": "is required to remain compatible with",
      "target": "M13",
      "face": "F11",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "affordable-service specification is required to remain compatible with service-cost model"
    },
    {
      "id": "C34",
      "source": "M19",
      "predicate": "is required to remain compatible with",
      "target": "M09",
      "face": "F12",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "energy fund is required to remain compatible with fare subsidy"
    },
    {
      "id": "C35",
      "source": "M19",
      "predicate": "is required to remain compatible with",
      "target": "M10",
      "face": "F12",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "energy fund is required to remain compatible with energy investment"
    },
    {
      "id": "C36",
      "source": "M09",
      "predicate": "is required to remain compatible with",
      "target": "M10",
      "face": "F12",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "fare subsidy is required to remain compatible with energy investment"
    },
    {
      "id": "C37",
      "source": "M19",
      "predicate": "is required to remain compatible with",
      "target": "M30",
      "face": "F13",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "energy fund is required to remain compatible with mode-shift fare incentive"
    },
    {
      "id": "C38",
      "source": "M19",
      "predicate": "is required to remain compatible with",
      "target": "M29",
      "face": "F13",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "energy fund is required to remain compatible with emissions standard"
    },
    {
      "id": "C39",
      "source": "M30",
      "predicate": "is required to remain compatible with",
      "target": "M29",
      "face": "F13",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "mode-shift fare incentive is required to remain compatible with emissions standard"
    },
    {
      "id": "C40",
      "source": "M27",
      "predicate": "is required to remain compatible with",
      "target": "M30",
      "face": "F14",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "fare ceiling is required to remain compatible with mode-shift fare incentive"
    },
    {
      "id": "C41",
      "source": "M27",
      "predicate": "is required to remain compatible with",
      "target": "M14",
      "face": "F14",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "fare ceiling is required to remain compatible with mode-shift hypothesis"
    },
    {
      "id": "C42",
      "source": "M30",
      "predicate": "is required to remain compatible with",
      "target": "M14",
      "face": "F14",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "mode-shift fare incentive is required to remain compatible with mode-shift hypothesis"
    },
    {
      "id": "C43",
      "source": "M22",
      "predicate": "is required to remain compatible with",
      "target": "M29",
      "face": "F15",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "propulsion safety standard is required to remain compatible with emissions standard"
    },
    {
      "id": "C44",
      "source": "M22",
      "predicate": "is required to remain compatible with",
      "target": "M15",
      "face": "F15",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "propulsion safety standard is required to remain compatible with environmental safety review"
    },
    {
      "id": "C45",
      "source": "M29",
      "predicate": "is required to remain compatible with",
      "target": "M15",
      "face": "F15",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "emissions standard is required to remain compatible with environmental safety review"
    },
    {
      "id": "C46",
      "source": "M01",
      "predicate": "is required to remain compatible with",
      "target": "M02",
      "face": "F16",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "safety commitment is required to remain compatible with access commitment"
    },
    {
      "id": "C47",
      "source": "M01",
      "predicate": "is required to remain compatible with",
      "target": "M11",
      "face": "F16",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "safety commitment is required to remain compatible with safe-access rule"
    },
    {
      "id": "C48",
      "source": "M02",
      "predicate": "is required to remain compatible with",
      "target": "M11",
      "face": "F16",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "access commitment is required to remain compatible with safe-access rule"
    },
    {
      "id": "C49",
      "source": "M01",
      "predicate": "is required to remain compatible with",
      "target": "M05",
      "face": "F17",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "safety commitment is required to remain compatible with environmental commitment"
    },
    {
      "id": "C50",
      "source": "M01",
      "predicate": "is required to remain compatible with",
      "target": "M15",
      "face": "F17",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "safety commitment is required to remain compatible with environmental safety review"
    },
    {
      "id": "C51",
      "source": "M05",
      "predicate": "is required to remain compatible with",
      "target": "M15",
      "face": "F17",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "environmental commitment is required to remain compatible with environmental safety review"
    },
    {
      "id": "C52",
      "source": "M02",
      "predicate": "is required to remain compatible with",
      "target": "M03",
      "face": "F18",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "access commitment is required to remain compatible with service reliability target"
    },
    {
      "id": "C53",
      "source": "M02",
      "predicate": "is required to remain compatible with",
      "target": "M12",
      "face": "F18",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "access commitment is required to remain compatible with boarding-time assumption"
    },
    {
      "id": "C54",
      "source": "M03",
      "predicate": "is required to remain compatible with",
      "target": "M12",
      "face": "F18",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "service reliability target is required to remain compatible with boarding-time assumption"
    },
    {
      "id": "C55",
      "source": "M03",
      "predicate": "is required to remain compatible with",
      "target": "M04",
      "face": "F19",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "service reliability target is required to remain compatible with affordability commitment"
    },
    {
      "id": "C56",
      "source": "M03",
      "predicate": "is required to remain compatible with",
      "target": "M13",
      "face": "F19",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "service reliability target is required to remain compatible with service-cost model"
    },
    {
      "id": "C57",
      "source": "M04",
      "predicate": "is required to remain compatible with",
      "target": "M13",
      "face": "F19",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "affordability commitment is required to remain compatible with service-cost model"
    },
    {
      "id": "C58",
      "source": "M04",
      "predicate": "is required to remain compatible with",
      "target": "M05",
      "face": "F20",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "affordability commitment is required to remain compatible with environmental commitment"
    },
    {
      "id": "C59",
      "source": "M04",
      "predicate": "is required to remain compatible with",
      "target": "M14",
      "face": "F20",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "affordability commitment is required to remain compatible with mode-shift hypothesis"
    },
    {
      "id": "C60",
      "source": "M05",
      "predicate": "is required to remain compatible with",
      "target": "M14",
      "face": "F20",
      "status": "design requirement; compatibility not assumed proven",
      "statement": "environmental commitment is required to remain compatible with mode-shift hypothesis"
    }
  ],
  "refinementStates": {
    "stream": [
      {
        "inhale": "Receive the full prepared 120-link ferry design, including compatibility requirements.",
        "compare": "Seed the complete prepared model; there is no earlier entry.",
        "changes": []
      },
      {
        "inhale": "The boarding arrangement does not meet the boarding/stability compatibility requirement.",
        "compare": "Retrieve entry 1: C13 becomes unmet; all other selected relations remain available.",
        "changes": [
          {
            "relationId": "C13",
            "text": "Boarding and stability compatibility requirement is unmet by the imagined arrangement.",
            "status": "unmet in construction"
          }
        ]
      },
      {
        "inhale": "Imagine a revised boarding arrangement that meets both retained standards.",
        "compare": "Retrieve entry 2: C13 becomes provisionally met; this is not engineering verification.",
        "changes": [
          {
            "relationId": "C13",
            "text": "Boarding and stability compatibility requirement is provisionally met by a revised arrangement.",
            "status": "provisionally met in construction"
          }
        ]
      },
      {
        "inhale": "Keep the boarding revision; terminal access and turnaround requirements now conflict in the selected arrangement.",
        "compare": "Retrieve entry 3: C22 becomes unmet while the C13 proposed repair remains.",
        "changes": [
          {
            "relationId": "C22",
            "text": "Terminal access and terminal turnaround compatibility requirement is unmet by the selected arrangement.",
            "status": "unmet in construction"
          }
        ]
      }
    ],
    "heart": [
      {
        "inhale": "Receive the full prepared 120-link practice model with explicit rules, allocations and compatibility requirements.",
        "compare": "Seed the complete prepared model; there is no earlier entry.",
        "changes": []
      },
      {
        "inhale": "Imagine recall that preserves honest memory but is pursued with pressure; this practice does not jointly honour honesty and gentle recall.",
        "compare": "Retrieve entry 1: C13 identifies an unmet joint-application requirement, not incompatible rules or a measured heart state.",
        "changes": [
          {
            "relationId": "C13",
            "text": "The current imagined practice does not jointly honour memory honesty and gentle recall because recall is pressured.",
            "status": "unmet in construction"
          }
        ]
      },
      {
        "inhale": "Imagine accepting the memory’s mixed meanings without pressure or embellishment.",
        "compare": "Retrieve entry 2: C13 is provisionally met in this practice; both honesty and gentle recall remain required.",
        "changes": [
          {
            "relationId": "C13",
            "text": "The current imagined practice provisionally honours memory honesty together with gentle recall.",
            "status": "provisionally met in construction"
          }
        ]
      },
      {
        "inhale": "Keep that repair; notice that demanding an unchanging feeling fails to honour the no-forcing rule together with the fluctuation allowance.",
        "compare": "Retrieve entry 3: C22 becomes unmet in the current practice; the rules remain compatible and C13 remains provisionally met.",
        "changes": [
          {
            "relationId": "C22",
            "text": "The current imagined practice does not jointly honour the no-forcing rule and fluctuation allowance while demanding an unchanging feeling.",
            "status": "unmet in construction"
          }
        ]
      }
    ],
    "body": [
      {
        "inhale": "Receive the full prepared 120-link mapping model with explicit descriptive rules, qualifications and compatibility requirements.",
        "compare": "Seed the complete prepared model; there is no earlier entry.",
        "changes": []
      },
      {
        "inhale": "Imagine precise wording that asserts certainty the sensation record does not support.",
        "compare": "Retrieve entry 1: C13 is unmet because this description does not jointly honour precision and uncertainty; those rules are not intrinsically incompatible.",
        "changes": [
          {
            "relationId": "C13",
            "text": "The current imagined practice does not jointly honour descriptive precision and sensation uncertainty because the description overstates certainty.",
            "status": "unmet in construction"
          }
        ]
      },
      {
        "inhale": "Imagine a precise description that explicitly includes what cannot be determined.",
        "compare": "Retrieve entry 2: C13 becomes provisionally met in the wording without claiming the bodily sensation changed.",
        "changes": [
          {
            "relationId": "C13",
            "text": "The current imagined practice provisionally honours descriptive precision together with sensation uncertainty.",
            "status": "provisionally met in construction"
          }
        ]
      },
      {
        "inhale": "Keep that repair; the image comparison now treats an uncertain image as established evidence.",
        "compare": "Retrieve entry 3: C22 is unmet in this application of image uncertainty and image comparison; their requirements remain compatible.",
        "changes": [
          {
            "relationId": "C22",
            "text": "The current imagined practice does not jointly honour image uncertainty and image comparison when it treats a tentative image as established.",
            "status": "unmet in construction"
          }
        ]
      }
    ]
  }
};
  const EXERCISES = ['stream', 'heart', 'body'];
  const clone = value => JSON.parse(JSON.stringify(value));
  function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  }
  function triangleFaces(nodes, relations) {
    const pairs = new Map(relations.map(r => [[r.from, r.to].sort().join('|'), r.id]));
    const faces = [];
    for (let a = 0; a < nodes.length; a += 1) for (let b = a + 1; b < nodes.length; b += 1) for (let c = b + 1; c < nodes.length; c += 1) {
      const ids = [nodes[a].id, nodes[b].id, nodes[c].id];
      const edges = [[ids[0], ids[1]], [ids[1], ids[2]], [ids[2], ids[0]]].map(pair => pairs.get(pair.sort().join('|')));
      if (edges.every(Boolean)) faces.push({ id: 'F' + String(faces.length + 1).padStart(2, '0'), nodes: ids, relations: edges });
    }
    return faces;
  }
  function pentagonalFaces(nodes, relations) {
    const adjacency = new Map(nodes.map(node => [node.id, []]));
    const pairs = new Map();
    relations.forEach(r => { adjacency.get(r.from).push(r.to); adjacency.get(r.to).push(r.from); pairs.set([r.from, r.to].sort().join('|'), r.id); });
    const seen = new Set();
    const faces = [];
    function visit(path) {
      if (path.length === 5) {
        if (!adjacency.get(path[4]).includes(path[0])) return;
        const key = path.slice().sort().join('|');
        if (seen.has(key)) return;
        seen.add(key);
        faces.push({id: 'F' + String(faces.length + 1).padStart(2, '0'), nodes: path.slice(), relations: path.map((node, i) => pairs.get([node, path[(i + 1) % 5]].sort().join('|')))});
        return;
      }
      adjacency.get(path[path.length - 1]).forEach(next => { if (!path.includes(next)) visit(path.concat(next)); });
    }
    nodes.forEach(node => visit([node.id]));
    return faces;
  }
  function refine(exercise) {
    const original = DATA.high[exercise].icosahedron;
    const mechanisms = DATA.mediators[exercise];
    const labels = new Map(mechanisms.map(item => [item.id, item.label]));
    const nodes = clone(original.nodes).concat(mechanisms.map(m => ({id: m.id, label: m.label})));
    const relations = [];
    original.relations.forEach((relation, index) => {
      const mediator = mechanisms[index];
      relations.push({id: relation.id + 'a', from: relation.from, to: mediator.id, text: mediator.first, kind: 'mediated relationship'});
      relations.push({id: relation.id + 'b', from: mediator.id, to: relation.to, text: mediator.second, kind: 'mediated relationship'});
    });
    DATA.compatibility.forEach(edge => relations.push({id: edge.id, from: edge.source, to: edge.target,
      text: exercise === 'stream' ? labels.get(edge.source) + ' is required to remain compatible with ' + labels.get(edge.target) + '.' : 'The current imagined practice must jointly honour ' + labels.get(edge.source) + ' and ' + labels.get(edge.target) + '.',
      kind: 'compatibility requirement', status: 'requirement; satisfaction not established', originalFace: edge.face}));
    return {nodes, relations, faces: triangleFaces(nodes, relations), originalFaces: clone(DATA.originalFaces), fourBreaths: clone(DATA.refinementStates[exercise])};
  }
  function sphereStates(exercise) {
    const refined = DATA.refinementStates[exercise];
    return [
      {inhale: 'Receive the entire prepared 120-link model as an integrated whole, with each selected relationship still recoverable.', compare: 'Seed the full integrated model; there is no earlier entry.', changes: []},
      {inhale: 'Encounter the same whole through ' + (exercise === 'heart' ? 'gentleness' : exercise === 'body' ? 'uncertainty' : 'accessibility') + '. A different attentional entry does not itself change any model relationship.', compare: 'Retrieve entry 1: emphasis changes; no selected relationship is claimed to change.', changes: []},
      clone(refined[1]), clone(refined[2])
    ].map((step, index) => {
      if (index === 2) step.compare = step.compare.replace('entry 1', 'entry 2');
      if (index === 3) step.compare = step.compare.replace('entry 2', 'entry 3');
      return step;
    });
  }
  const GRAPHS = {
    circle: 'One explicit relationship between two selected roles. The circle signifies a complete relational unit; it is not a compulsory graph self-loop.',
    'half-circle': 'Two distinct meanings between the same two roles. This is a semantic multigraph: count both links even when their endpoints and direction agree.',
    triangle: 'Three roles and all three pair connections; geometric closure does not imply a causal loop.',
    square: 'A four-role cycle with four selected relationships.',
    pentagon: 'A five-role cycle with five selected relationships.',
    hexagon: 'A six-role cycle with six selected relationships.',
    heptagon: 'A seven-role cycle with seven selected relationships.',
    octagon: 'An eight-role cycle with eight selected relationships.',
    prism: 'Two three-role cycles and three substantive role correspondences: six roles and nine links.',
    cube: 'Two four-role cycles and four substantive role correspondences: eight roles and twelve links.',
    dodecahedron: 'Generalized Petersen G(10,2): twenty roles, thirty unique endpoint pairs, twelve pentagonal faces. Semantic direction is independent of geometric adjacency.',
    icosahedron: 'Two poles, two five-role rings and ten staggered crosslinks: twelve roles, thirty unique endpoint pairs, twenty triangular faces.',
    geodesic: 'Subdivide each icosahedral edge through one named mediator and add three compatibility requirements in each original face: forty-two roles, 120 links, eighty triangular faces. Original direct links are replaced, not retained.',
    sphere: 'The declared 120-link model held as an integrated, revisable whole. Sphere supplies no intrinsic infinite link count and does not erase its internal organisation.'
  };
  const CONTEXT = {
    stream: 'Illustrative imagined scenes and conceptual models selected within consciousness streaming. They are examples of meanings, not observations supplied by the application.',
    heart: 'Illustrative experienced meanings and deliberately constructed models of a heart-focused exercise. Feelings, imagery and practice rules are not measurements of cardiac coherence or claims of physiological causation.',
    body: 'Illustrative seated-mapping experiences and deliberately constructed models of describing and interpreting a bodily episode. The links relate roles and meanings; sensation properties alone do not constitute the progression or establish an emotion or diagnosis.'
  };
  const models = {};
  DATA.stages.forEach(stage => {
    models[stage.id] = {};
    EXERCISES.forEach(exercise => {
      let graph;
      if (stage.id === 'geodesic' || stage.id === 'sphere') graph = refine(exercise);
      else graph = clone(DATA.low[exercise][stage.id] || DATA.high[exercise][stage.id]);
      if (stage.id === 'dodecahedron') graph.faces = pentagonalFaces(graph.nodes, graph.relations);
      if (stage.id === 'icosahedron') graph.faces = clone(DATA.originalFaces).map(face => ({id: face.id, nodes: face.nodes, relations: face.edges}));
      if (stage.id === 'sphere') graph.fourBreaths = sphereStates(exercise);
      if (DATA.lowStates[exercise][stage.id]) graph.fourBreaths = clone(DATA.lowStates[exercise][stage.id]);
      const prepared = stage.count >= 30;
      const model = Object.assign(graph, {
        stageId: stage.id, exercise, title: stage.name + ' · ' + (exercise === 'stream' ? 'Consciousness streaming' : exercise === 'heart' ? 'Heart-focused practice' : 'Body mapping'),
        description: CONTEXT[exercise], relationshipCount: stage.count, nodeCount: graph.nodes.length,
        graphConvention: GRAPHS[stage.id], prepared,
        preparation: prepared ? 'Learn and recover the complete register before four-entry rehearsal. A baseline plus named changes stands for the entire model only when its other links remain recoverable. This is not a claim that 30 or 120 new relationships can be constructed in one ordinary inhale. If an entry takes several breaths, use record-paced N = 1 rather than calling it one-breath-back.' : 'Read the complete selected register. Every inhale selects the current relationship structure; every exhale encodes it before deliberate retrieval and comparison. The rest of the scene may remain present.',
        provenance: {manualEdition: '2.2', status: 'illustrative construction', countBasis: 'distinct selected semantic relationships', physiologicalMeasurement: false},
        countingNote: 'Count source relationships, not properties, palace bindings or routine historical comparisons. An inverse paraphrase is not a second relationship. A relation can be represented as failed, provisional or unknown without being counted as an established functioning support. Requirements and their satisfaction status remain distinguishable.'
      });
      if (model.fourBreaths) {
        let stateNodes = clone(model.nodes);
        let stateRelations = clone(model.relations);
        model.states = model.fourBreaths.map((step, index) => {
          const changes = step.changes || [];
          const nodeChanges = step.nodes || [];
          const relationIndex = new Map(stateRelations.map(relation => [relation.id, relation]));
          const nodeIndex = new Map(stateNodes.map(node => [node.id, node]));
          changes.forEach(change => {
            const relation = relationIndex.get(change.relationId);
            if (!relation) throw new Error('Unknown relationship in example: ' + change.relationId);
            ['text', 'from', 'to', 'status'].forEach(key => { if (change[key] !== undefined) relation[key] = change[key]; });
          });
          nodeChanges.forEach(change => {
            const node = nodeIndex.get(change.id);
            if (!node) throw new Error('Unknown role in example: ' + change.id);
            node.label = change.label;
          });
          const changedNodes = new Set(nodeChanges.map(change => change.id));
          const changedRelations = new Set(changes.map(change => change.relationId));
          stateRelations.forEach(relation => { if (changedNodes.has(relation.from) || changedNodes.has(relation.to)) changedRelations.add(relation.id); });
          return {label: 'Breath ' + (index + 1), breath: index + 1, nodes: clone(stateNodes), relations: clone(stateRelations), changedRelationIds: Array.from(changedRelations), changedNodeIds: Array.from(changedNodes), inhale: step.inhale, compare: step.compare};
        });
      }
      models[stage.id][exercise] = model;
    });
  });
  deepFreeze(models);
  const STAGES = deepFreeze(clone(DATA.stages));
  function getModel(stageId, exercise) {
    const stage = Object.prototype.hasOwnProperty.call(models, stageId) ? stageId : 'circle';
    const context = EXERCISES.includes(exercise) ? exercise : 'stream';
    return models[stage][context];
  }
  function applyChanges(model, changes) {
    if (!model || !Array.isArray(model.relations) || !Array.isArray(changes)) throw new TypeError('A model and a changes array are required.');
    const result = clone(model);
    const index = new Map(result.relations.map(relation => [relation.id, relation]));
    const touched = new Set();
    changes.forEach(change => {
      if (!change || !index.has(change.relationId)) throw new RangeError('A change must name an existing relationship.');
      if (touched.has(change.relationId)) throw new RangeError('A relationship may be changed only once in one update.');
      if (typeof change.text !== 'string' || !change.text.trim()) throw new TypeError('A changed relationship requires explicit meaning.');
      touched.add(change.relationId);
      const relation = index.get(change.relationId);
      relation.text = change.text;
      ['from', 'to'].forEach(key => {
        if (change[key] !== undefined) {
          if (!result.nodes.some(node => node.id === change[key])) throw new RangeError('A changed endpoint must name an existing role.');
          relation[key] = change[key];
        }
      });
      if (typeof change.status === 'string') relation.status = change.status;
    });
    return deepFreeze(result);
  }
  function getState(stageId, exercise, breathNumber) {
    const model = getModel(stageId, exercise);
    if (!Number.isInteger(breathNumber) || breathNumber < 1 || breathNumber > 4) throw new RangeError('Choose breath 1 through 4.');
    if (!model.states) throw new RangeError('This model has no declared four-breath sequence.');
    return model.states[breathNumber - 1];
  }
  return deepFreeze({STAGES, EXERCISES: EXERCISES.slice(), getModel, getState, applyChanges});
});
