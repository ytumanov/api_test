const {base, token} = require('../config.json');
const chai = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();
const {expect, assert} = chai;

chai.use(chaiHttp);

module.exports = (endpoint, name) => {

  const getName = () => {
    return `${name}_name_${Date.now()}`;
  }

  describe(`${endpoint}: authorized requests`, () => {
    let access_token;

    const getAll = () => {
      return chai.request(base)
      .get(`/${endpoint}`)
      .set('Authorization', `Bearer ${access_token}`)
      .send()
      .then(res => {
        return JSON.parse(res.text);
      })
      .catch((err) => {
        console.error(JSON.stringify({error: err.message}));
      });
    }

    const getTotalCount = () => {
      return getAll()
      .then(res => {
        return res.length;
      })
      .catch((err) => {
        console.error(JSON.stringify({error: err.message}));
      });
    };

    // before all is not used, because token lifetime 5 minutes should be enough for tests execution.
    before('get access', async () => {
      // could be moved to ENV variables
      const payload = {
        username: 'usernameTest',
        password: 'qwerty123',
        grant_type: 'password',
      };

      try {
        const res = await chai.request(token)
        .post('')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(payload);

      access_token = res.body.access_token;

      res.should.have.status(200);
      } catch (error) {
        throw error;
      }
    });

    after(`delete ${endpoint}`, async () => {
      let objects;
      try {
        let res = await chai.request(base)
        .get(`/${endpoint}`)
        .set('Authorization', `Bearer ${access_token}`)
        .send();
        res.should.have.status(200);
        objects = JSON.parse(res.text);
      } catch (error) {
        throw error;
      }

      try {
        // It could be better to drop these values in DB, but i do not have an access:)
        await objects.forEach(async obj => {
          res = await chai.request(base)
          .delete(`/${endpoint}/id/${obj.Id}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send();
        });
      } catch (error) {
        throw error;
      }
    });

    describe('POST', () => {
      it(`should be possible to create new ${name} on POST /${endpoint}`, async () => {
        const totalBefore = await getTotalCount();
        const payload = {
          Name: getName(),
        };
        try {
          const res = await chai.request(base)
          .post(`/${endpoint}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send(payload);
          res.should.have.status(200);
        } catch (error) {
          throw error;
        }
        const totalAfter = await getTotalCount();
        expect(totalBefore + 1).to.equal(totalAfter);
      });
    
      it(`should be possible to create more than 1 ${name} from user`, async () => {
        const totalBefore = await getTotalCount();

        const payload = {
          Name: getName(),
        };
        try {
          const res = await chai.request(base)
          .post(`/${endpoint}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send(payload);
          res.should.have.status(200);
        } catch (error) {
          throw error;
        }

        const payload2 = {
          Name: getName(),
        };
        try {
          const res = await chai.request(base)
          .post(`/${endpoint}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send(payload2);
          res.should.have.status(200);
        } catch (error) {
          throw error;
        }

        const totalAfter = await getTotalCount();
        expect(totalBefore + 2).to.equal(totalAfter);
      });
    
      it(`should NOT be possible to create ${name} with same name`, async () => {
        const totalBefore = await getTotalCount();
        const name = getName();

        const payload = {
          Name: name,
        };
        try {
          const res = await chai.request(base)
          .post(`/${endpoint}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send(payload);
          res.should.have.status(200);
        } catch (error) {
          throw error;
        }

        const payload2 = {
          Name: name,
        };
        try {
          const res = await chai.request(base)
          .post(`/${endpoint}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send(payload2);
          res.should.have.status(400);
          // Need to check error message in specs.
          expect(res.text).to.equal('Duplicate results found for identifier.');
        } catch (error) {
          throw error;
        }

        const totalAfter = await getTotalCount();
        expect(totalBefore + 1).to.equal(totalAfter);
      });

      it(`should NOT be possible to create ${name} without Name parameter`, async () => {
        const totalBefore = await getTotalCount();

        const payload = {
          Name1: getName(),
        };
        try {
          const res = await chai.request(base)
          .post(`/${endpoint}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send(payload);
          res.should.have.status(400);
          expect(res.text).to.equal('Invalid request.');
        } catch (error) {
          throw error;
        }

        const totalAfter = await getTotalCount();
        expect(totalBefore).to.equal(totalAfter);
      });
    });

    describe(`GET all ${endpoint}`, () => {
      it(`should be possible to get all ${endpoint}`, async () => {

        const objects = await getAll();

        objects.map(obj => {
          assert.hasAllKeys(obj, ['Id', 'Name']);
          assert.isNumber(obj['Id']);
          assert.isString(obj['Name']);
        });

      });
    });

    describe(`GET ${name} by id`, () => {
      it(`should be possible to get ${name} by Id`, async () => {
        const name = getName();
        const payload = {
          Name: name,
        };

        try {
          const res = await chai.request(base)
          .post(`/${endpoint}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send(payload);
          res.should.have.status(200);
        } catch (error) {
          throw error;
        }

        //get just created obj with valid ID. Could connect to db if have an access
        const createdObject = (await getAll()).slice(-1)[0];

        let objectName;
        try {
          const res = await chai.request(base)
          .get(`/${endpoint}/id/${createdObject.Id}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send();
          res.should.have.status(200);
          objectName = JSON.parse(res.text);
        } catch (error) {
          throw error;
        }

        expect(objectName.Name).to.equal(name);
      });

      it(`should NOT be possible to get ${name} by Id if Id is not valid`, async () => {
        try {
          const res = await chai.request(base)
          .get(`/${endpoint}/id/1000000`)
          .set('Authorization', `Bearer ${access_token}`)
          .send();
          res.should.have.status(404);
        } catch (error) {
          throw error;
        }
      });
    });

    describe(`DELETE ${name} by id`, () => {
      it(`should be possible to delete ${name}`, async () => {
        const createdObject = (await getAll()).slice(-1)[0];

        //check that it exist
        try {
          const res = await chai.request(base)
          .get(`/${endpoint}/id/${createdObject.Id}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send();
          res.should.have.status(200);
        } catch (error) {
          throw error;
        }

        try {
          const res = await chai.request(base)
          .delete(`/${endpoint}/id/${createdObject.Id}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send();
          res.should.have.status(200);
        } catch (error) {
          throw error;
        }

        //check that it removed
        try {
          const res = await chai.request(base)
          .get(`/${endpoint}/id/${createdObject.Id}`)
          .set('Authorization', `Bearer ${access_token}`)
          .send();
          res.should.have.status(404);
        } catch (error) {
          throw error;
        }

      });

      it(`should NOT be possible to delete ${name} with not valid Id`, async () => {
        try {
          const res = await chai.request(base)
          .delete(`/${endpoint}/id/1000000`)
          .set('Authorization', `Bearer ${access_token}`)
          .send();
          res.should.have.status(404);
        } catch (error) {
          throw error;
        }
      });

    });

  });

  describe(`${endpoint}: unauthorized requests`, () => {
    it(`should return unauthorized status 401 on GET /${endpoint}`, async () => {
      try {
        const res = await chai.request(base)
        .get(`/${endpoint}`);
      res.should.have.status(401);
      } catch (error) {
        throw error;
      }
    });

    it(`should return unauthorized status 401 on GET /${endpoint}/id/id`, async () => {
      try {
        const res = await chai.request(base)
        .get(`/${endpoint}/id/1`);
      res.should.have.status(401);
      } catch (error) {
        throw error;
      }
    });

    it(`should return unauthorized status 401 on POST /${endpoint}`, async () => {
      try {
        const res = await chai.request(base)
        .get(`/${endpoint}`);
      res.should.have.status(401);
      } catch (error) {
        throw error;
      }
    });

    it(`should return unauthorized status 401 on DELETE /${endpoint}/id/id`, async () => {
      try {
        const res = await chai.request(base)
        .get(`/${endpoint}/id/1`);
      res.should.have.status(401);
      } catch (error) {
        throw error;
      }
    });
  });

}
