const functions = require("firebase-functions");
const app = require('express')();
const FBAuth = require("./util/fbAuth");

const cors = require("cors");
app.use(cors());

const {
  getAllProjects,
  getProject,
  getDiagram,
  diagramProject,
  postOneProject,
  deleteProject,
  editProjectDetails,
  deleteDiagram,
  saveDiagram,
  commentOnDiagram,
  getAllAttributes,
} = require("./handlers/projects");

const {
  signup,
  login,
  addUserDetails,
  getAuthenticatedUser,
  getObservers,
  uploadImage,
  signupWithGoogle,
  passwordReset,
} = require("./handlers/user");

//Project routes
app.get('/projects',FBAuth, getAllProjects);
app.get("/project/:projectId", FBAuth, getProject);
app.get("/diagram/:diagramId", FBAuth, getDiagram);
app.post("/project/:projectId/diagram", FBAuth, diagramProject);
app.post(
  "/project/:projectId/diagram/:diagramId/comment",
  FBAuth,
  commentOnDiagram
);

app.post("/project", FBAuth, postOneProject);
app.delete("/project/:projectId", FBAuth, deleteProject);
app.post("/project/edit", FBAuth, editProjectDetails);
app.delete("/project/:projectId/diagram/:diagramId", FBAuth, deleteDiagram);
app.post("/project/:projectId/diagram/:diagramId", FBAuth, saveDiagram);
app.get('/attributes', getAllAttributes);

// Signup route
app.post('/signup', signup);
app.post('/login', login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/observers", FBAuth, getObservers);
app.post("/signup/google", signupWithGoogle);
app.post("/passwordReset", passwordReset);

exports.api = functions.https.onRequest(app);