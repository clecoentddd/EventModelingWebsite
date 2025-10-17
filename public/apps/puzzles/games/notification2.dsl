DESCRIPTION: "How to handle a notification using an external API: we make it explicit here by showing steps that are outside our system"
LEVEL: 2

ELEMENT: 1, Screen, "Confirm your Email toto@zozo.com", 1;1
ELEMENT: 2, Command, "Confirm Email", 1;0
ELEMENT: 3, Event, "Email Confirmed", 1;-1
ELEMENT: 4, ReadModel, "Email Notification to send", 2;0
ELEMENT: 5, Automation, "EMail Processor (API)", 3;1
ELEMENT: 6, Command, "Send Email", 3;0
ELEMENT: 7, Event, "Email Sent", 3;-1
ELEMENT: 8, Event, "Email Sending Failed (retry)", 4;-1
ELEMENT: 9, ReadModel, "List of emails sent", 5;0
ELEMENT: 10, Automation, "Email Notifier (internal)", 6;1
ELEMENT: 11, Command, "Mark Email Send", 6;0
ELEMENT: 12, Event, "Notification by Email Sent", 6;-1
ELEMENT: 13, ReadModel, "Notifications sent", 7;0
ELEMENT: 14, Screen, "An email has been sent to you! Click here to connect with your email !", 7;1

FLOW: 1 to 2
FLOW: 2 to 3
FLOW: 3 to 4
FLOW: 4 to 5
FLOW: 5 to 6
FLOW: 6 to 7
FLOW: 6 to 8
FLOW: 7 to 9
FLOW: 9 to 10
FLOW: 10 to 11
FLOW: 11 to 12
FLOW: 12 to 13
FLOW: 13 to 14
BACK_FLOW: 12 to 9
