DESCRIPTION: "Make a cappuccino, Milk First Then Espresso (Any failure in the process will be handled later but we have a post-it)"
LEVEL: 2

ELEMENT: 1, Screen, "Select Cappuccino", 1;1
ELEMENT: 2, Command, "Order Cappuccino", 1;0
ELEMENT: 3, Event, "Cappuccino Ordered", 1;-1
ELEMENT: 4, ReadModel, "Cappuccinos  to prepare", 2;0
ELEMENT: 5, Automation, "Milk Frost Maker", 3;1
ELEMENT: 6, Command, "Prepare Milk", 3;0
ELEMENT: 7, Event, "Milk Prepared", 3;-1
ELEMENT: 8, Event, "Milk Frost Maker Failed", 4;-1
ELEMENT: 9, ReadModel, "Espressos to Prepare", 5;0
ELEMENT: 10, Automation, "Prepare Espresso", 6;1
ELEMENT: 11, Command, "Prepare Espresso", 6;0
ELEMENT: 12, Event, "Espresso Prepared", 6:-1
ELEMENT: 13, ReadModel, "Drinks ready", 7;0
ELEMENT: 14, Screen, "Drinks Ready", 7;1

FLOW: 1 to 2
FLOW: 2 to 3
FLOW: 3 to 4
FLOW: 4 to 5
FLOW: 5 to 6
FLOW: 6 to 7
FLOW: 7 to 9
FLOW: 6 to 8 
FLOW: 9 to 10
FLOW: 10 to 11
FLOW: 11 to 12
FLOW: 12 to 13
FLOW: 13 to 14
BACK_FLOW: 7 to 4
BACK_FLOW: 12 to 9

