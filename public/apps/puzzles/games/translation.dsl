ELEMENT: 1, External_Event, "System Refiller - Alert Refiller KO", 1;-2
ELEMENT: 2, Automation, "Alert Notifer Barista ", 2;1
ELEMENT: 3, Command, "Translate to Coffee Required", 2;0
ELEMENT: 4, Event, "Coffee Required - ER001", 2;-1

FLOW: 1 to 2
FLOW: 2 to 3
FLOW: 3 to 4