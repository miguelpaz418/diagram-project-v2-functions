const { admin, db } = require("../util/admin");

const config = require("../util/config");

const { initializeApp } = require('firebase/app');

const {
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithCredential, 
  GoogleAuthProvider,
}  = require('firebase/auth');

initializeApp(config);

const {
    validateSignupData,
    validateLoginData,
    reduceUserDetails,
    validatePasswordResetData
  } = require("../util/validators");


exports.signup = (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        profession: request.body.profession
    };

    const { valid, errors } = validateSignupData(newUser);

    if (!valid) return response.status(400).json(errors);

    const noImg = "no-image.png";

    let token, userId;
    db.doc(`/users/${newUser.email}`)
        .get()
        .then(doc => {
        if (doc.exists) {
            return response
            .status(400)
            .json({ email: "este correo electrónico ya esta en uso" });
        } else {
            const auth = getAuth();
            return createUserWithEmailAndPassword(auth, newUser.email, newUser.password)
        }
        })
        .then(data => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(idToken => {
            token = idToken;
            const userCredentials = {
                userId,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                profession: newUser.profession,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`
            };
            return db.doc(`/users/${userId}`).set(userCredentials);
        })
        .then(() => {
            return response.status(201).json({ token });
        })
        .catch(err => {
            console.error(err);
            if (err.code === "auth/email-already-in-use") {
                return response
                    .status(400)
                    .json({ email: "este correo electrónico ya esta en uso" });
            } else {
                return response
                    .status(500)
                    .json({ general: "Algo salió mal. Por favor, vuelva a intentarlo" });
            }
        });
};

exports.login = (request, response) => {
    const user = {
        email: request.body.email,
        password: request.body.password
    };
  
    const { valid, errors } = validateLoginData(user);
  
    if (!valid) return response.status(400).json(errors);
  
    const auth = getAuth();
    signInWithEmailAndPassword(auth, user.email, user.password)
    .then(data => {
        return data.user.getIdToken();
    })
    .then(token => {
        return response.json({ token });
    })
    .catch(err => {
        console.error(err);
        return response.status(403).json({
          general:
            "Email o password son incorrectos, por favor intente nuevamente"
        });
    });
};

exports.addUserDetails = (request, response) => {
    let userDetails = reduceUserDetails(request.body);
  
    db.doc(`/users/${request.user.userId}`)
      .update(userDetails)
      .then(() => {
        return response.json({
          message: "Detalles de usuario agregados correctamente"
        });
      })
      .catch(err => {
        console.error(err);
        return response.status(500).json({ error: err.code });
      });
};

exports.getAuthenticatedUser = (request, response) => {
    let userData = {};
    db.doc(`/users/${request.user.userId}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          userData.credentials = doc.data();
          //return response.json(userData);
          return db
            .collection("notifications")
            .where("recipient", "==", request.user.userId)
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();
        }
      })
      .then(data => {
        userData.notifications = [];
        if (data.exists) {
          data.forEach(doc => {
            userData.notifications.push({
              recipient: doc.data().recipient,
              sender: doc.data().sender,
              createdAt: doc.data().createdAt,
              type: doc.data().type,
              read: doc.data().read,
              projectId: doc.data().projectId,
              notificationId: doc.id,
              diagramId: doc.data().diagramId
            });
          });
        }
        return response.json(userData);
      })
      .catch(err => {
        console.error(err);
        return response.status(500).json({ error: err.code });
      });
};

exports.getObservers = (request, response) => {
    db.collection("users")
      .orderBy("createdAt", "desc")
      .get()
      .then(data => {
        let observers = [];
        data.forEach(doc => {
          if (request.user.userId !== doc.id) {
            observers.push({
              userId: doc.id,
              ...doc.data()
            });
          }
        });
  
        return response.json(observers);
      })
      .catch(err => console.error(err));
};

exports.newToken = (request, response) => {};

exports.addUserDetails = (request, response) => {
    let userDetails = reduceUserDetails(request.body);
  
    db.doc(`/users/${request.user.userId}`)
      .update(userDetails)
      .then(() => {
        return response.json({
          message: "Detalles de usuario agregados correctamente"
        });
      })
      .catch(err => {
        console.error(err);
        return response.status(500).json({ error: err.code });
      });
};

exports.uploadImage = (request, response) => {
    const BusBoy = require("busboy");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");
  
    const busboy = new BusBoy({ headers: request.headers });
  
    let imageFileName;
    let imageToBeUploaded = {};
  
    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
        return response
          .status(400)
          .json({ error: "El tipo de archivo enviado es incorrecto" });
      }
  
      const imageExtension = filename.split(".").pop();
      imageFileName = `${Math.round(
        Math.random() * 100000000000
      )}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on("finish", () => {
      admin
        .storage()
        .bucket(`${config.storageBucket}`)
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype
            }
          }
        })
        .then(() => {
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
          return db.doc(`/users/${request.user.userId}`).update({ imageUrl });
        })
        .then(() => {
          return response.json({ message: "Imagen cargada exitosamente" });
        })
        .catch(err => {
          console.error(err);
          return response.status(500).json({ error: err.code });
        });
    });
    busboy.end(request.rawBody);
};


exports.signupWithGoogle = (request, response) => {
  let token, userId;
  console.log(request.body.idToken)
  const credential = GoogleAuthProvider.credential(null, request.body.idToken);
/** 
  const credential = firebase.auth.GoogleAuthProvider.credential(
    null,
    request.body.idToken
  );
*/
    const auth = getAuth();
    signInWithCredential(auth, credential)
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      const userCredentials = {
        userId,
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email,
        createdAt: new Date().toISOString(),
        imageUrl: request.body.imageUrl
      };
      db.doc(`/users/${userId}`)
        .get()
        .then(doc => {
          if (!doc.exists) {
            return db.doc(`/users/${userId}`).set(userCredentials);
          }
        })
        .catch(err => {
          console.error(err);
        });
    })
    .then(() => {
      return response.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      return response.status(403).json({
        general: "Credenciales incorrectas, por favor intente nuevamente"
      });
    });
};

exports.passwordReset = (request, response) => {
  const passwordResetData = {
    email: request.body.email
  };

  const { valid, errors } = validatePasswordResetData(passwordResetData);

  if (!valid) return response.status(400).json(errors);

  const auth = firebase.auth();
  let emailAddress = request.body.email;
  auth
    .sendPasswordResetEmail(emailAddress)
    .then(() => {
      return response.json({
        message: "Mensaje enviado correctamente, por favor revisa tu correo"
      });
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};