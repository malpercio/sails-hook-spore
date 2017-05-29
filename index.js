const Promise = require('bluebird');
const each = require('lodash/forEach');
const includes = require('lodash/includes');
const isArray = require('lodash/isArray');
const retry = require('bluebird-retry');

function ensureArray(data){
  if(!isArray(data)){
    data = [data];
  }
  return data;
}

function fix(json, cb){
  json = ensureArray(json);
  return Promise.mapSeries(json, (object) => {
    return global[object.model].findOrCreate({where:object.data});
  }).asCallback(cb);
}

function seed(model, json, cb){
  let data = [];
  json = ensureArray(json);
  each(json, (value) => {
    let newObject = {
      model: model,
      data: value
    };
    data.push(newObject);
  });
  return fix(data, cb);
}

function seedAll(cb){
 return fix(sails.config.spore.mainGenerator()).asCallback(cb);
}

function seedAllC(req, res){
    return seedAll()
    .then(()=>{
      return res.status(201).json({
        model: 'all',
        status: 'seeded',
      });
    })
    .catch((err) => {
      return res.status(500).json({
        model: 'all',
        status: 'error',
        type: err.name,
        message: err.message,
      });
    });
}

function seedModel(model, data, cb){
  if(!data && sails.config.generators[model]){
    return seed(req.params.model, req.body).asCallback(cb);
  }
  return seedModel(data).asCallback(cb);;
}

function seedModelC(req, res){
  return seedModel(req.params.model, req.body)
    .then(()=>{
      return res.status(201).json({
        model: req.params.model,
        status: 'seeded',
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({
        model: req.params.model,
        status: 'error',
        type: err.name,
        message: err.message,
      });
    });
}

function seedQuery(data, cb){
  return fix(data, cb);
}

function seedQueryC(req, res){
  return seedQuery(req.body)
  .then(()=>{
    return res.status(201).json({
      model: '(Maybe) all',
      status: 'seeded',
    });
  })
  .catch((err) => {
    return res.status(500).json({
      model: req.params.model,
      status: 'error',
      type: err.name,
      message: err.message,
    });
  });
}

function unseedAll(cb){
  let sailsModels = [];
  for(let key in sails.models){
    sailsModels.push(sails.models[key]);
  }
  return Promise.map(sailsModels, (model) => {
    if(!includes(sails.config.spore.catalogs.models, model.name)){
      return retry(() => {
        return model.destroy({where:{}, force:true})
      });
    }
  }).asCallback(cb);
}

function unseedAllC(req, res){
  return unseedAll()
  .then(()=>{
    return res.status(201).json({
      model: 'all',
      status: 'unseeded',
    });
  })
  .catch((err) => {
    return res.status(500).json({
      model: 'all',
      status: 'error',
      type: err.name,
      message: err.message,
    });
  });
}

function unseedModel(model, cb){
  return global[model].destroy({where:{}, force:true}).asCallback(cb);
}

function unseedModelC(req, res){
  return unseedModel(req.params.model)
    .then(()=>{
      return res.status(201).json({
        model: req.params.model,
        status: 'unseeded',
      });
    })
    .catch((err) => {
      return res.status(500).json({
        model: req.params.model,
        status: 'error',
        type: err.name,
        message: err.message,
      });
    });
}

function fillCatalog(catalog, cb){
  return Promise.mapSeries(catalog, (object) => {
    return global[object.model].findOrCreate({where:object.data});
  }).asCallback(cb);
}

module.exports = (sails) => {
  return {

    configure: () => {
      if(sails.config.environment === 'production'){
        sails.hooks.spore.routes = {};
      }
      sails.config.spore.catalogs = sails.config.spore.catalogs? sails.config.spore.catalogs : {models:[], data:[]};
      if(!sails.config.spore.mainGenerator){
        sails.config.spore.mainGenerator = () => {
          data = [];
          for(let generator of sails.config.spore.generators){
            if(typeof(generator) == 'function'){
              for(let i of generator()){
                data.push(i);
              }
            }else {
              generator.times = generator.times? generator.times: 15;
              let iterator = generator.fx();
              for(let i = 1;i <= generator.times; i++){
                data.push(iterator.next().value);
              }
            }
          }
          return data;
        }
      }
    },

    routes: {
      before: {
        'get /db/all': seedAllC,
        'post /db/:model': seedModelC,
        'delete /db/all': unseedAllC,
        'delete /db/:model': unseedModelC,
        'post /db/query': seedQueryC,
      },
    },

    initialize: (next) => {
      let hooks = [
        'hook:sequelize:loaded',
      ];
      sails.after(hooks, () => {
        fillCatalog(sails.config.spore.catalogs.data, next);
      });
    },
    fillCatalog,
    seedAll,
    seedModel,
    unseedAll,
    unseedModel,
    seedQuery,

  };
};
