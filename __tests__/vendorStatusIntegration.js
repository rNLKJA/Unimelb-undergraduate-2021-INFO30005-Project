
const request = require('supertest');
const app = require('../app');
const Van = require('../models/vanSchema');
const mongoose = require('mongoose');

describe("Integration test for setting status of van", () => {
    let agent = request.agent(app);
    let cookie = null;

    beforeAll(() => agent
        .post('/vendor/login')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
            van_id: 'Ardeth Lavon',
            password: 'aPZaneuZVX',
          })

        .then((res) => {
            cookie = res
                .headers['set-cookie'][0]
               .split(',')
               .map(item => item.split(';')[0])
               .join(';')
        }));


    test("Test logging in to outstanding orders page", () => {
        return agent

            .get("/vendor/Ardeth%20Lavon/outstanding")
            .set('Cookie', cookie)

            .then((response) => {
                expect(response.statusCode).toBe(200);
                 expect(response.text).toContain("Ardeth Lavon")
            });
   })

   test("Test changing van status to open", () => {
        return agent
            .post('/vendor/setStatus/')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                    van_id: 'Ardeth Lavon',
                    status: 'Open',
                })
            .then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.text).toContain("Status has been updated")
            });
    });

    test("Test changing van status to open", () => {
        return agent
            .post('/vendor/setStatus/')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                    van_id: 'Ardeth Lavon',
                    status: 'Closed',
                })
            .then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.text).toContain("Status has been updated")
            });
    });

    test("Test changing status of van not logged in as", () => {
        return agent

            .get("/vendor/Beth%20Dorris/outstanding")
            .set('Cookie', cookie)

            .then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.text).toContain('NEED LOGIN VERIFY')
            });
    });




})