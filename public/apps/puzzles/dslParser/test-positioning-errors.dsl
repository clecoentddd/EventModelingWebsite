DESCRIPTION: "Test DSL with positioning errors"
LEVEL: 1

ELEMENT: 1, Screen, "Select Coffee", 1;-1
ELEMENT: 2, Command, "Order Coffee", 1;1
ELEMENT: 3, Event, "Coffee Ordered", 1;2
ELEMENT: 4, ExternalEvent, "Stock Alert", 2;0

FLOW: 1 to 2
FLOW: 2 to 3