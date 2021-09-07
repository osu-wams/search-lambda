# Search Lambda
AWS lambda code exported osusearch-callApigeeApi in aws. Handles calls to OSU's locations and directory APIs.

## AWS Secret Manager
OSU API access and secret keys are stored in AWS secret manager. The bearer token created using the access and secret keys are also stored in the secret manager and refreshed programmatically every 23 hours.
