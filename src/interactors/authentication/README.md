# Authentication System

## Logging In

After receiving valid credentials, we create a signed JWT that includes a cryptographically random xsrf token. This token is sent in the response body (and also as a non-httpOnly cookie `XSRF_TOKEN` so that Angular's and Axios's automatic XSRF protection can be used).

We also create a cryptographically random refresh token and store it in the database. This is sent to the client as a long-lived cookie `refreshToken` whose expiry matches the expiry date stored in the database.

## Refresh

 When the JWT expires, the client can request a new JWT with the `refreshToken` cookie. This requires a database lookup, but it shouldn't happen very often.

## CSRF Protection

A client reads the xsrf token from the login response body or the `XSRF_TOKEN` cookie and supplies it back to the server as an `X-XSRF-TOKEN` header. When the server authenticates non-HEAD and non-GET requests, we check that the client has sent back the correct `X-XSRF-TOKEN` header. Since third-party sites can't read the `XSRF_TOKEN` cookie, they can't supply the correct `X-XSRF-TOKEN` header. To validate that the supplied xsrf token is valid, we check the payload of the JWT. Because the JWT is signed, we can trust the value there. This means we don't have to have any database lookup to validate requests.

