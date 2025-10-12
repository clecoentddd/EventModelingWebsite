ELEMENT: 1, Screen, "Select Espresso", 1;1
ELEMENT: 2, Command, "Order Espresso", 1;0
ELEMENT: 3, Event, "Espresso Ordered", 1;-1
ELEMENT: 4, ReadModel, "Espressos to prepare", 2;0
ELEMENT: 5, Automation, "Espresso Maker", 3;1
ELEMENT: 6, Command, "Prepare Espresso", 3;0
ELEMENT: 7, Event, "Espresso Prepared", 3;-1


FLOW: 1 to 2
FLOW: 2 to 3
FLOW: 3 to 4
FLOW: 4 to 5
FLOW: 5 to 6
FLOW: 6 to 7
BACK_FLOW: 7 to 4