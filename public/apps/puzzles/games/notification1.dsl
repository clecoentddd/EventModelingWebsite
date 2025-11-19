DESCRIPTION: "How to handle a email notification using an external API: we make it implicit here as we do not map the action of sending an email by another system."
LEVEL: 2

ELEMENT: 1, Screen, "Confirm your Email toto@zozo.com", 1;1
ELEMENT: 2, Command, "Cofirm Email", 1;0
ELEMENT: 3, Event, "Email Confirmed", 1;-1
ELEMENT: 4, ReadModel, "Email Notification to send", 2;0
ELEMENT: 5, Automation, "Email Notifier (internal)", 3;1
ELEMENT: 6, Command, "Mark Email Send", 3;0
ELEMENT: 7, Event, "Notification by Email Sent", 3;-1
ELEMENT: 8, ReadModel, "Notifications sent", 4;0
ELEMENT: 9, Screen, "An email has been sent to you!", 4;1

FLOW: 1 to 2
FLOW: 2 to 3
FLOW: 3 to 4
FLOW: 4 to 5
FLOW: 5 to 6
FLOW: 6 to 7
FLOW: 7 to 8
FLOW: 8 to 9
BACK_FLOW: 7 to 4