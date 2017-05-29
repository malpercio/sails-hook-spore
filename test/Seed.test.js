const Promise = require('bluebird');
const Sails = require('sails').Sails;
const should = require('should');
const empty = require('lodash/isEmpty');
const request = require("supertest-as-promised")(Promise);

describe('Seed hook test', function() {
  this.timeout(20000);


  it('should not expose routes in production', (done) => {
    let sailsSaved = sails,
      sailsProd = new Sails();
    sailsProd.load({
      environment: 'production',
      hooks: {
        orm:false,
        blueprints: false,
        pubsub: false,
        spore: require('./../index')
      },
      port:8081,
      log:{
        level:'silent'
      },
    }, (err) => {
      if(err){
        return done(err);
      }
      empty(sailsProd.hooks.spore.routes).should.be.true();
      sailsProd.lower((err)=>{
        sails = sailsSaved;
        done(err);
      });
    });
  });

  it('should seed', ()  => {
    let app = request(sails.hooks.http.app);
    return app.get('/db/all')
      .expect(201)
      .then((res) => {
        res.body.model.should.equal('all');
        res.body.status.should.equal('seeded');
        return Restaurant.findAll()
      })
      .then((restaurantsFound) => {
        if(restaurantsFound.length == 0){
          throw new Error('No restaurants found after seed');
        }
      });
  });

  it('should create catalogs', ()  => {
    return TableType.findAndCountAll({where:{}})
      .then((result)=> {
        result.count.should.equal(4);
      });
  });

  it('should seed without default', ()  => {
    let app = request(sails.hooks.http.app);
    return app.get('/db/all')
      .expect(201)
      .then((res) => {
        res.body.model.should.equal('all');
        res.body.status.should.equal('seeded');
        return Restaurant.findAll()
      })
      .then((restaurantsFound) => {
        if(restaurantsFound.length == 0){
          throw new Error('No restaurants found after seed');
        }
      });
  });

  it('should unseed', ()  => {
    let app = request(sails.hooks.http.app);
    app.get('/db/all');
    return app.delete('/db/all')
      .expect(201)
      .then((res) => {
        res.body.model.should.equal('all');
        res.body.status.should.equal('unseeded');
        return Restaurant.findAll()
      })
      .then((restaurantsFound) => {
        if(restaurantsFound.length != 0){
          throw new Error('Some restaurants found after unseed');
        }
      });
  });

});
