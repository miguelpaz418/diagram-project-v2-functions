const isEmail = email => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return email.match(emailRegEx) ? true : false;
};

const isEmpty = string => {
  return string.trim() === "" ? true : false;
};

exports.validateSignupData = data => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Este campo no debe estar vacío";
  } else if (!isEmail(data.email)) {
    errors.email = "Debe ingresar una dirección de correo electrónico válida";
  }

  if (isEmpty(data.password))
    errors.password = "Este campo no debe estar vacío";
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Passwords must match";

  if (isEmpty(data.firstName))
    errors.firstName = "Este campo no debe estar vacío";
  if (isEmpty(data.lastName))
    errors.lastName = "Este campo no debe estar vacío";
  if (isEmpty(data.profession))
    errors.profession = "Este campo no debe estar vacío";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.validateLoginData = data => {
  let errors = {};
  if (isEmpty(data.email)) {
    errors.email = "Este campo no debe estar vacío";
  } else if (!isEmail(data.email)) {
    errors.email = "Debe ingresar una dirección de correo electrónico válida";
  }
  if (isEmpty(data.password))
    errors.password = "Este campo no debe estar vacío";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.validateCreateProject = data => {
  let errors = {};

  if (isEmpty(data.title)) errors.title = "Este campo no debe estar vacío";
  if (isEmpty(data.description))
    errors.description = "Este campo no debe estar vacío";
  if (isEmpty(data.objective))
    errors.objective = "Este campo no debe estar vacío";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.reduceUserDetails = data => {
  let userDetails = {};

  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if (!isEmpty(data.profession.trim()))
    userDetails.profession = data.profession;
  if (!isEmpty(data.location.trim())) userDetails.location = data.location;
  if (!isEmpty(data.firstName.trim())) userDetails.firstName = data.firstName;
  if (!isEmpty(data.lastName.trim())) userDetails.lastName = data.lastName;

  return userDetails;
};

exports.reduceProjectDetails = data => {
  let projectDetails = {};

  if (!isEmpty(data.title.trim())) projectDetails.title = data.title;
  if (!isEmpty(data.description.trim()))
    projectDetails.description = data.description;
  if (!isEmpty(data.objective.trim()))
    projectDetails.objective = data.objective;

  return projectDetails;
};

exports.validateCreateDiagram = data => {
  let errors = {};
  if (isEmpty(data.diagramName))
    errors.diagramName = "Este campo no debe estar vacío";
  if (isEmpty(data.type)) errors.type = "Este campo no debe estar vacío";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.validatePasswordResetData = data => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Este campo no debe estar vacío";
  } else if (!isEmail(data.email)) {
    errors.email = "Debe ingresar una dirección de correo electrónico válida";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};
