Screen, "Subscription Checkout", 1;1, bottom, top
Command, "Submit Payment", 1;0, bottom, top
Event, "Payment Failed", 1;-1, right, bottom
ReadModel, "User Cart", 2;0, top, bottom
Wheel, "Auto Retry", 3;1, bottom, top
Command, "Retry Payment", 3;0, bottom, top
Event, "Payment Retried", 3;-1, right, bottom, 2
Event, "Payment failed", 4;-1
ReadModel, "Payments List", 5;0, top, bottom
Wheel, "Something", 6;1