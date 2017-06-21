const Promise = require('bluebird');
const each = require('lodash/forEach');
const forOwn = require('lodash/forOwn');
const isObject = require('lodash/isObject');
const includes = require('lodash/includes');
const camelCase = require('lodash/camelCase');
const isArray = require('lodash/isArray');
const pickBy = require('lodash/pickBy');
const omitBy = require('lodash/omitBy');
const omit = require('lodash/omit');
const indexOf = require('lodash/indexOf');
const retry = require('bluebird-retry');
const debug = require('debug');

function ensureArray(data){
  if(!isArray(data)){
    data = [data];
  }
  return data;
}

function getValue(attrib){
  if(isArray(attrib)){
    return Promise.map(attrib, (element) => {
      return getValue(element);
    });
  }else if(isObject(attrib)){
    return fix(attrib)
      .then(([id]) => {
        return id;
      });
  }else{
    return Promise.resolve(attrib);
  }
}

function treatQuery(object){
  let query = {},
    data = object.data;
  for (let attrib in data) {
    query[attrib] = getValue(data[attrib]);
  }
  query.exclude = object.exclude? object.exclude : [];
  return Promise.props(query);
}

function fix(json, cb){
  const error = debug('spore:seed')
  json = ensureArray(json);
  return Promise.mapSeries(json, (object) => {
    return treatQuery(object)
      .then((query) => {
        let processedQuery = {
          attributes: new Promise(function(resolve, reject) {
            resolve(omitBy(query, isArray));
          }),
          associations: new Promise(function(resolve, reject) {
            let assoc = pickBy(query, isArray);
            return resolve(omit(assoc, ['exclude']))
          }),
          finder: new Promise(function(resolve, reject) {
            let attributes = omitBy(query, (attrib) => {
              return (isArray(attrib) || indexOf(query.exclude, attrib) > -1)
            });
            return resolve(attributes);
          })
        };
        return Promise.props(processedQuery);
      })
      .then((query) => {
        let results = [
          global[object.model].findOne({where: query.finder}),
          query,
        ];
        return Promise.all(results)
      })
      .then(([instance, query]) => {
        let results = [
          query
        ];
        if(!instance){
          results.push(global[object.model].create(query.attributes));
        }else{
          results.push(instance.update(query.attributes, {returning:true}));
        }
        return Promise.all(results);
      })
      .then(([query, instance]) => {
        let associations = Promise.map(Object.keys(query.associations), (key) => {
          let assignment = camelCase('set ' + key);
          return instance[assignment](query.associations[key]);
        });
        return Promise.all([instance,associations]);
      })
      .then(([objectCreated]) => {
        if(!object.afterCreate){
          return Promise.resolve([objectCreated.id]);
        }
        let promiseFunction = Promise.promisify(object.afterCreate);
        return Promise.all([objectCreated.id, promiseFunction(objectCreated)]);
      })
      .then(([objectID]) => {
        return objectID;
      })
      .catch((err) => {
        error(err);
        throw err;
      });
  })
   .asCallback(cb);
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

function fillCatalog(cb){
  return fix(sails.config.spore.catalogs.data, cb);
}

module.exports = (sails) => {
  return {

    configure: () => {
      sails.config.spore.ormHook = sails.config.spore.ormHook? sails.config.spore.ormHook: 'sequelize';
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
        'hook:' + sails.config.spore.ormHook + ':loaded',
      ];
      sails.after(hooks, () => {
        fillCatalog(next);
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
