const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

module.exports = checkAuth;

const client = jwksClient({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: "https://tridnguyen.auth0.com/.well-known/jwks.json"
});

function verifyToken(token, cb) {
  let decodedToken;
  try {
    decodedToken = jwt.decode(token, {complete: true});
  } catch (e) {
    console.error(e);
    cb(e);
    return;
  }
  client.getSigningKey(decodedToken.header.kid, function (err, key) {
    if (err) {
      console.error(err);
      cb(err);
      return;
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    jwt.verify(token, signingKey, function (err, decoded) {
      if (err) {
        console.error(err);
        cb(err);
        return
      }
      cb(null, decoded);
    });
  });
}

function checkAuth (fn) {
  return function (req, res) {
    if (!req.headers || !req.headers.authorization) {
      res.status(401).send('No authorization token found.');
      return Promise.reject('No authorization token found.');
    }
    const parts = req.headers.authorization.split(' ');
    if (parts.length != 2) {
      res.status(401).send('Bad credential format.');
      return Promise.reject('Bad credential format.');
    }
    const scheme = parts[0];
    const credentials = parts[1];

    if (!/^Bearer$/i.test(scheme)) {
      res.status(401).send('Bad credential format.');
      return Promise.reject('Bad credential format.');
    }
    return new Promise((resolve, reject) => {
      verifyToken(credentials, function (err) {
        if (err) {
          res.status(401).send('Invalid token');
          return reject('Invalid token.');
        }
        resolve(fn(req, res));
      });
    });
  };
}

