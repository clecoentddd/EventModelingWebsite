DESCRIPTION: "A simple view state: UI - Command - Event - View (state of the system after a state change)"
LEVEL: 1

ELEMENT: 1, Screen, "Select Espresso", 1;1
ELEMENT: 2, Command, "Order Espresso", 1;0
ELEMENT: 3, Event, "Espresso Ordered", 1;-1
ELEMENT: 4, ReadModel, "Espressos to prepare", 2;0

FLOW: 1 to 2
FLOW: 2 to 3
FLOW: 3 to 4