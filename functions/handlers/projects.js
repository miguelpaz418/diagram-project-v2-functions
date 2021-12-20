const { json } = require("express");
const { db, admin } = require("../util/admin");
const {
  validateCreateProject,
  reduceProjectDetails,
  validateCreateDiagram
} = require("../util/validators");

exports.getAllProjects = (request, response) => {
    db.collection("projects")
        .get()
        .then(data => {
            let projects = [];
            data.forEach(doc => {
              projects.push({
                  projectId: doc.id,
                  ...doc.data()
              });
            });
            return response.json(projects);
        })
        .catch(err => console.error(err));
};

exports.getProject = async (request, response) => {
    let projectData = {};

    const cityRef = db.collection('projects').doc(`${request.params.projectId}`);
    await cityRef.get()
      .then(doc => {
        if (!doc.exists) {
          return response.status(404).json({ error: "Proyecto no encontrado" });
        }
        projectData = doc.data();
        projectData.projectId = doc.id;
        return db
          .collection("diagrams")
          .orderBy("createdAt", "desc")
          .where("projectId", "==", request.params.projectId)
          .get();
      })
      .then(data => {
        projectData.diagrams = [];
        data.forEach(doc => {
          let diagram = doc.data();
          diagram.diagramId = doc.id;
          projectData.diagrams.push(diagram);
        });
        return response.json(projectData);
      })
      .catch(err => {
        console.error(err);
        response.status(500).json({ error: err.code });
      });
};

exports.getDiagram = (request, response) => {
    let diagramData = {};
    db.doc(`/diagrams/${request.params.diagramId}`)
      .get()
      .then(doc => {
        if (!doc.exists) {
          return response.status(404).json({ error: "Diagrama no encontrado" });
        } else {
          diagramData = doc.data();
          diagramData.diagramId = doc.id;
          return db
            .collection("comments")
            .orderBy("createdAt", "desc")
            .where("diagramId", "==", request.params.diagramId)
            .get();
        }
      })
      .then(data => {
        diagramData.comments = [];
        data.forEach(doc => {
          let comment = doc.data();
          comment.commentId = doc.id;
          diagramData.comments.push(comment);
        });
        return response.json(diagramData);
      })
      .catch(err => {
        console.error(err);
        response.status(500).json({ error: err.code });
      });
};

exports.diagramProject = (request, response) => {
    const newDiagram = {
      diagram: request.body.diagram,
      diagramName: request.body.diagramName,
      type: request.body.type,
      createdAt: new Date().toISOString(),
      projectId: request.params.projectId,
      diagramUserId: request.user.userId,
      commentCount: 0,
      objects: [],
      objectsIds: []
    };
  
    const { valid, errors } = validateCreateDiagram(newDiagram);
  
    if (!valid) return response.status(400).json(errors);
  
    db.doc(`/projects/${request.params.projectId}`)
      .get()
      .then(doc => {
        if (!doc.exists) {
          return response.status(404).json({ error: "Proyecto no encontrado" });
        }
      })
      .then(() => {
        return db.collection("diagrams").add(newDiagram);
      })
      .then(doc => {
        const resDiagram = newDiagram;
        resDiagram.diagramId = doc.id;
        response.json(resDiagram);
      })
      .catch(err => {
        console.log(err);
        response.status(500).json({ error: "Algo salió mal" });
      });
};

exports.postOneProject = (request, response) => {
  const newProject = {
    title: request.body.title,
    description: request.body.description,
    objective: request.body.objective,
    projectUserId: request.user.userId,
    observers: request.body.observers,
    userImage: request.user.imageUrl,
    firstNameUser: request.user.firstNameUser,
    lastNameUser: request.user.lastNameUser,
    createdAt: new Date().toISOString()
  };

  const { valid, errors } = validateCreateProject(newProject);

  if (!valid) return response.status(400).json(errors);

  db.collection("projects")
    .add(newProject)
    .then(doc => {
      const resProject = newProject;
      resProject.projectId = doc.id;

      if (newProject.observers.length > 0) {

        let information = {
          docId: doc.id,
          projectId:  doc.id,
          firstNameUser: newProject.firstNameUser,
          diagramId: "",
        }
        saveNotifications(newProject.observers, "observer", information)
      }
      response.json(resProject);
    })
    .catch(err => {
      response.status(500).json({ error: "Algo salió mal" });
      console.error(err);
    });
};

exports.deleteProject = (request, response) => {
  const document = db.doc(`/projects/${request.params.projectId}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return response.status(404).json({ error: "Proyecto no encontrado" });
      }
      if (doc.data().projectUserId !== request.user.userId) {
        return response.status(403).json({ error: "No autorizado" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      response.json({ message: "Proyecto eliminado con éxito" });
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

exports.editProjectDetails = (request, response) => {
  let projectDetailsRequest = {
    title: request.body.title,
    description: request.body.description,
    objective: request.body.objective
  };

  let projectDetails = reduceProjectDetails(projectDetailsRequest);
  const document = db.doc(`/projects/${request.body.projectId}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return response.status(404).json({ error: "Proyecto no encontrado" });
      }
      if (doc.data().projectUserId !== request.user.userId) {
        return response.status(403).json({ error: "No autorizado" });
      } else {
        return document.update(projectDetails);
      }
    })
    .then(() => {
      response.json({ message: "Detalles añadidos correctamente" });
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};


exports.deleteDiagram = (request, response) => {
  const document = db.doc(`/diagrams/${request.params.diagramId}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return response.status(404).json({ error: "Diagrama no encontrado" });
      }
      if (doc.data().diagramUserId !== request.user.userId) {
        return response.status(403).json({ error: "No autorizado" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      response.json({ message: "Diagrama eliminado con éxito" });
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

exports.saveDiagram = (request, response) => {
  let firstNameUser = request.user.firstNameUser
  let diagram = {
    diagram: request.body.diagram
  };

  const document = db.doc(`/diagrams/${request.params.diagramId}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return response.status(404).json({ error: "Diagrama no encontrado" });
      }
      if (doc.data().diagramUserId !== request.user.userId) {
        return response.status(403).json({ error: "No autorizado" });
      } else {
        let {objectsIds, objects} = getDiagramObjects(diagram)
        diagram.objects = objects
        diagram.objectsIds = objectsIds
        document.update(diagram);
        return doc
      }
    })
    .then((res) => {
      searchProjectForNotification(res, firstNameUser, res.data().projectId, res.id, "modify")
      response.json({ message: "Diagrama actualizado con éxito" });
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

const getDiagramObjects = (diagram) => {
  let jsonDiagram = JSON.parse(diagram.diagram)
  let objects = []
  let objectsIds = []
  let newObject = {}
  jsonDiagram.cells.forEach(element => {
    if(element.class === 'object'){
      newObject = {
        id: element.id,
        name: element.attrs.label.text,
        colorName: element.attrs.root.labelcolor,
        color: element.attrs.body.fill,
        shape: element.attrs.root.title,
      }
      objects.push(newObject)
      objectsIds.push(element.id)
    }
  });
  
  return {objectsIds, objects}
}

const searchProjectForNotification = (doc, firstNameUser, projectId, diagramId, type) => {
  let docId = doc.id
  db.doc(`/projects/${projectId}`)
    .get()
    .then(doc => {
      let observers = doc.data().observers 
      if (doc.exists && observers.length > 0) {
        let information = {
          docId,
          projectId,
          firstNameUser,
          diagramId
        }
        if(type === "comment"){
          observers = [doc.data().projectUserId]
        }
        saveNotifications(observers, type, information)
      }
    })
    .catch(err => {
      console.error(err);
      return;
    });
}

const saveNotifications = (userIds, type, information) => {
  let tokens = []
  let notificationTitle = ""
  let notificationDescription = ""

  let nuevaNotification = {
    createdAt: new Date().toISOString(),
    sender: information.firstNameUser,
    type: type,
    read: false,
    projectId: information.projectId
  }
  db.collection('tokens')
    .where('userId', 'in', userIds)
    .get()
    .then(doc => {
      doc.docs.forEach(data => {
        if(data.data().token !== ""){
          tokens.push(data.data().token)
        }
      })

      if(type === "observer"){
        notificationTitle = information.firstNameUser +' ha creado un projecto'
        notificationDescription = information.firstNameUser +' te asignó como observador'
        dataValue = information.projectId
      }else if(type === "comment"){
        notificationTitle = information.firstNameUser +' ha comentado tu diagrama'
        notificationDescription = ' ha sido comentado'
        nuevaNotification.diagramId = information.diagramId
        dataValue = information.docId
      }else{
        notificationTitle = information.firstNameUser +' ha modificado el diagrama'
        notificationDescription = information.firstNameUser +' ha modificado el diagrama'
        nuevaNotification.diagramId = information.diagramId
        dataValue = information.diagramId           
      }
      nuevaNotification.title = notificationTitle
      nuevaNotification.description = notificationDescription
      nuevaNotification.description = notificationDescription
      
      const payload = {
        notification: {
          title: notificationTitle,
          body: notificationDescription,
          icon: '../favicon.ico',
        },
        data: {
          type: type,
          id: dataValue
        }      
      };
      userIds.forEach(id => {
    
        nuevaNotification.recipient = id
        db.collection("notifications").add(nuevaNotification);
      });
      admin.messaging().sendToDevice(tokens, payload);

    })
    .catch(err => {
      console.error(err);
      return;
    });
  
  //end forEach
  return tokens
}


exports.commentOnDiagram = (request, response) => {
  if (request.body.body.trim() === "") {
    return response
      .status(400)
      .json({ comment: "Este campo no debe estar vacío" });
  }

  const newComment = {
    body: request.body.body,
    createdAt: new Date().toISOString(),
    diagramId: request.params.diagramId,
    userId: request.user.userId,
    userImage: request.user.imageUrl,
    firstNameUser: request.user.firstNameUser,
    lastNameUser: request.user.lastNameUser,
    projectId: request.params.projectId
  };

  db.doc(`/diagrams/${request.params.diagramId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return response.status(404).json({ error: "Diagrama no encontrado" });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then((res) => {
      searchProjectForNotification(res, newComment.firstNameUser, newComment.projectId, newComment.diagramId, "comment")
      response.json(newComment);
    })
    .catch(err => {
      console.log(err);
      response.status(500).json({ error: "Algo salió mal" });
    });
};

exports.getAllAttributes = (request, response) => {
  db.collection("attributes")
      .get()
      .then(data => {
          let attributes = [];
          data.forEach(doc => {
            let attribute = doc.data();
            attributes.push(attribute);
          });
          return response.json(attributes);
      })
      .catch(err => console.error(err));
};

exports.getComment = (request, response) => {
  const document = db.doc(`/comments/${request.params.commentId}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return response.status(404).json({ error: "Diagrama no encontrado" });
      }
      let comment = doc.data();
      comment.commentId = doc.id;
      response.json(comment);
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};