const { admin, db } = require("./admin");

module.exports = (request, response, next) => {
  let idToken;
  if (
    request.headers.authorization &&
    request.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = request.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No se encontró token");
    return response.status(403).json({ error: "No autorizado" });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then(decodedToken => {
      request.user = decodedToken;
      //console.log(decodedToken);
      return db
        .collection("users")
        .where("userId", "==", request.user.uid)
        .limit(1)
        .get();
    })
    .then(data => {
      request.user.userId = request.user.uid;
      if (data.size > 0) {
        request.user.imageUrl = data.docs[0].data().imageUrl;
        request.user.firstNameUser = data.docs[0].data().firstName;
        request.user.lastNameUser = data.docs[0].data().lastName;
      }
      return next();
    })
    .catch(err => {
      console.error("Error al verificar el token", err);
      return response.status(403).json(err);
    });
};
