# EV Platform Architecture

One MERN backend and four React portals: Customer, Staff/Operator, Franchisee, Central Command. Shared MongoDB domain models cover users, vehicles, hubs, chargers, jobs, inventory, payments, telemetry, reviews and audit logs. The architecture follows the supplied workflow: a shared cloud/platform core and API layer connects the four access platforms. fileciteturn6file2L478-L505

## Real-time
Device/charger -> gateway/MQTT -> Node telemetry processor -> Mongo/time-series -> Socket.IO -> React dashboards. fileciteturn6file3L670-L719

## Security
JWT, role checks, bcrypt password hashing, Helmet, CORS, rate limiting, validation, audit logging. The production deployment must replace development providers with verified external adapters.
