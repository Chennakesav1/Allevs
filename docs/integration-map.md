# End-to-end integration map

Customer -> REST API -> MongoDB -> Job -> Dispatch -> Technician -> Job Card -> Invoice -> Payment -> Notification -> Review

EV/Charger -> MQTT/HTTP IoT adapter -> telemetry processor -> MongoDB -> Socket.IO -> Staff/Command/Customer dashboards

Inventory -> Issue/Return/PO -> Financial events -> Franchise/Command analytics

Charging -> Charger session -> charging transaction -> payment/wallet -> revenue -> anomaly rules

Franchise -> revenue + expense + capex + EMI -> ROI/payback -> health score -> expansion recommendation

## External adapters
- Payment: Razorpay/PayU-style gateway boundary; configure credentials and webhook verification before production.
- Notifications: Notification collection + Socket.IO; SMTP/SMS/WhatsApp provider can be attached to the notification service.
- Storage: local upload adapter; switch to S3/Cloudinary adapter for production.
- IoT: MQTT adapter with HTTP telemetry endpoint; production devices must publish authenticated telemetry.

## Required production secrets
MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, MQTT_URL/MQTT_USERNAME/MQTT_PASSWORD, SMTP credentials, cloud-storage credentials.
