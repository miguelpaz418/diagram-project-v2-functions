const { json } = require("express");
const { object } = require("firebase-functions/v1/storage");
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
    let allCells = []
    db.doc(`/diagrams/${request.params.diagramId}`)
      .get()
      .then(doc => {
        if (!doc.exists) {
          return response.status(404).json({ error: "Diagrama no encontrado" });
        } else {
          diagramData = doc.data();
          idDiagram = doc.id
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

        let objectsRef = db.collection('objects')

        if(diagramData.type === "1"){
          objectsRef = objectsRef.where('diagramId', '==', idDiagram)
        }else{
          objectsRef = objectsRef.where('diagramIds', 'array-contains', idDiagram)

        }

        return objectsRef.get()
      })      
      .then(data => {
        let jsonDiagram = JSON.parse(diagramData.diagram)
        diagramData.objects = []
        let copyObjects = []
        if(jsonDiagram.hasOwnProperty('cells')){
          copyObjects = jsonDiagram.cells;
        }
        var copy = {}

        data.docs.forEach(doc => {

          let shape =  doc.data().object
          copy =  doc.data().object
          shape.attrs.body.fill = doc.data().color
          shape.attrs.label.text = doc.data().name
          shape.attrs.root.labelcolor = doc.data().colorName
          if(diagramData.type === "1"){
            copyObjects.push(shape)
          }else{
            dataRef = diagramData.refObjects
            
            dataRef.forEach(element => {
              copy = doc.data().object
              if(element.ref === doc.id){

                copy.position = element.position
                copy.attrs.root.rid = element.ref
                copy.id = element.origin
                copy.ports = element.ports
                copy.embeds = element.embeds

                if(element.parent !== ""){
                  copy.parent = element.parent
                }

                copyObjects.push(copy)

              }
              copy = {}
            });
          }
        })

        jsonDiagram.cells = copyObjects
        diagramData.diagram = JSON.stringify(jsonDiagram)
        diagramData.diagramId = idDiagram
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
      refObjects: [],
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
        //consultar el numero de objectos
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
        let objectsIds = doc.data().objectsIds
        objectsIds.forEach(id => {
          removeObject(id, request.params.diagramId)
        });
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
  
  let idsRemoved = request.body.idsRemoved
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

        let {objectsIds, cells, refObjects} = getDiagramObjects(diagram, doc.data().type, doc.id, idsRemoved)
        if(idsRemoved.length){
          idsRemoved.forEach(id => {
            if(!objectsIds.includes(id)){
              removeObject(id,doc.id)
            }
          });
        }
        let jsonDiagram = JSON.parse(diagram.diagram)
        jsonDiagram.cells = cells
        diagram.diagram = JSON.stringify(jsonDiagram)
        diagram.objectsIds = objectsIds
        diagram.refObjects = refObjects
        document.update(diagram);
        return doc
      }
    })
    .then((res) => {
      searchProjectForNotification(res, request.user.userId, firstNameUser, res.data().projectId, res.id, "modify")
      response.json({ message: "Diagrama actualizado con éxito" });
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

const getDiagramObjects = (diagram, type, diagramId, idsRemoved) => {
  let jsonDiagram = JSON.parse(diagram.diagram)
  let cells = []
  let objectsIds = []
  let refObjects = []
  let parent = ""
  let newObject = {}
  let idObject = ""
  jsonDiagram.cells.forEach(element => {
    if(element.class === 'object'){
      idObject = element.id
      if(type !== "1"){
        
        idObject = element.attrs.root.rid
      }
      newObject = {
        id: idObject,
        name: element.attrs.label.text,
        colorName: element.attrs.root.labelcolor,
        color: element.attrs.body.fill,
        shape: element.attrs.root.title,
        diagramIds: [],
        diagramId,
        object: element
      }
      //cambiar la informacion que se guarda en el diagrama
      saveObject(newObject, diagramId, idsRemoved)

      if(element.parent !== undefined){
        parent = element.parent
      }
      refObjects.push({
        origin: element.id, 
        ref: element.attrs.root.rid, 
        position: element.position,
        ports:  element.ports,
        embeds:  element.embeds,
        parent,
        id: idObject,
        name: element.attrs.label.text,
        colorName: element.attrs.root.labelcolor,
        color: element.attrs.body.fill,
        shape: element.attrs.root.title,
      })
      objectsIds.push(idObject)

    }else{
      cells.push(element)
    }
  });

  return {objectsIds, cells, refObjects}
}

const removeObject = (id,diagramId) => {

  const document = db.doc(`/objects/${id}`);
  document
    .get()
    .then(doc => {
      if (doc.exists) {
        if(doc.data().diagramId === diagramId){
          // eliminar diagramas
          let diagramIds = doc.data().diagramIds
            diagramIds.forEach(id => {
            let toEliminate = db.doc(`/diagrams/${id}`);
            toEliminate
              .get()
              .then(doc => {
                if (doc.exists) {
                  toEliminate.delete();
                  doc.data().objectsIds.forEach(element => {
                    removeObject(element,id)
                  });
                }
              })
              .catch(err => {
                console.error(err);
                return response.status(500).json({ error: err.code });
              });
          });
          document.delete();
        }else{
          // eliminar de la lista de diagramas
          // cuando el objecto esta mas de una vez 
          let diagramIds = doc.data().diagramIds
          diagramIds = diagramIds.filter(id => id !==  diagramId)
          document.update({diagramIds});
        }
      }
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

const saveObject = (object,diagramId, idsRemoved) => {

  const document = db.doc(`/objects/${object.id}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        //create
        //db.collection("objects").add(object);
        db.doc(`/objects/${object.id}`).set(object);
      }else{
        //update
        if(doc.data().diagramId === diagramId){
          object.diagramIds = doc.data().diagramIds
          document.update(object);
        }else{
          let diagramIds = doc.data().diagramIds
          if(!diagramIds.includes(diagramId)){
            diagramIds.push(diagramId)
            document.update({diagramIds});
          }
        }

      }
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

const searchProjectForNotification = (doc, userId, firstNameUser, projectId, diagramId, type) => {
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

        if(type === "comment" && doc.data().projectUserId !== userId){

          observers = [doc.data().projectUserId]

          type = "commentOwner"
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
  db.collection('users')
    .where('userId', 'in', userIds)
    .get()
    .then(doc => {
      doc.docs.forEach(data => {
        if(data.data().notificationToken !== ""){
          tokens.push(data.data().notificationToken)
        }
      })
      const nameCapitalized = information.firstNameUser.charAt(0).toUpperCase() + information.firstNameUser.slice(1).toLowerCase();
      if(type === "observer"){
        notificationTitle = nameCapitalized +' ha creado un projecto'
        notificationDescription = nameCapitalized +' te asignó como observador'
        dataValue = information.projectId
      }else if(type === "comment"){
        notificationTitle = nameCapitalized +' ha comentado un diagrama'
        notificationDescription = 'ver diagrama como observador'
        nuevaNotification.diagramId = information.diagramId
        dataValue = information.docId
      }else if(type === "commentOwner"){
        notificationTitle = nameCapitalized +' ha comentado tu diagrama'
        notificationDescription = ' ha sido comentado'
        nuevaNotification.diagramId = information.diagramId
        dataValue = information.docId
        type = "comment"
      }else{
        notificationTitle = nameCapitalized +' ha modificado el diagrama'
        notificationDescription = nameCapitalized +' ha modificado el diagrama'
        nuevaNotification.diagramId = information.diagramId
        dataValue = information.diagramId           
      }
      nuevaNotification.title = notificationTitle
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
      searchProjectForNotification(res, newComment.userId, newComment.firstNameUser, newComment.projectId, newComment.diagramId, "comment")
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

exports.getObjectDiagram = (request, response) => {

  const document = db.doc(`/objects/${request.params.objectId}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return response.json(0);
      }
      let object = doc.data();
      response.json(object.diagramIds.length);
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
}
