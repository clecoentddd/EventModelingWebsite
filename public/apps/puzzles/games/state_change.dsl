DESCRIPTION: "A simple state change: UI - Command - Event"
LEVEL: 1

ELEMENT: 1, Screen, "Select Espresso", 1;1
ELEMENT: 2, Command, "Order Espresso", 1;0
ELEMENT: 3, Event, "Espresso Ordered", 1;-1


FLOW: 1 to 2
FLOW: 2 to 3