const sails = require('sails');
const each = require('lodash/forEach');
const includes = require('lodash/includes');
const Promise = require('bluebird');
const retry = require('bluebird-retry');

before((done) => {
  sails.lift({
    environment: 'test',
    hooks: {
      orm:false,
      blueprints: false,
      pubsub: false,
      spore: require('./../index'),
    },
    log:{
      level:'silent'
    },
  }, done);
});

after((done) => {
  sails.lower(done);
});

beforeEach(() => {
  let models = [];
  for (let model in sails.models){
    models.push(sails.models[model]);
  }
  return Promise.map(models, (model) => {
    if(!includes(sails.config.spore.catalogs.models, model.name)){
        return retry(() => {
          return new Promise((resolve, reject) => {
            return resolve(model.destroy({where: {}, force:true}));
          })}
        );
      }
    });
});
