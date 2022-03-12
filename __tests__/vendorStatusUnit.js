
const mongoose = require('mongoose');

const Van = require("../models/vanSchema");
const Order = require("../models/orderSchema")

const vendorController = require("../controllers/vendorController");



describe("Unit test for setStatus", () => {
    const req = {
        body: {
            van_id:"Ardeth Lavon", 
            status:"Open",
        },
    };

    const res = {
        send: jest.fn()
    };

    beforeAll(() => {
        res.send.mockClear();

        Van.findOne = jest.fn().mockResolvedValue([{
            van_id: "Ardeth Lavon"
        }]);

        Van.updateOne = jest.fn().mockResolvedValue([{
            
        }])

        vendorController.setStatus(req, res);
    });

    test("Test 1: Setting Van status", () => {
        expect(res.send).toHaveBeenCalledTimes(1);
        expect(res.send).toHaveBeenCalledWith("Status has been updated");
    })


});

describe("Unit test for setStatus with van not in database", () => {
    const req = {
        body: {
            van_id: "not a real van", 
        },
    };

    const res = {
        send: jest.fn()
    };

    beforeAll(() => {
        res.send.mockClear();

        Van.findOne.mockImplementationOnce(() => {
            throw new Error();
          });

        vendorController.setStatus(req, res);
    });

    test("Test 1: Setting Van status", () => {
        expect(res.send).toHaveBeenCalledTimes(1);
        expect(res.send).toHaveBeenCalledWith("Database query failed");
    })


});

describe("Unit test for setStatus with null van", () => {
    const req = {
        body: {
            van_id:null, 
        },
    };

    const res = {
        send: jest.fn()
    };

    beforeAll(() => {
        res.send.mockClear();

        Van.findOne.mockImplementationOnce(() => {
            van = null;
          });

        vendorController.setStatus(req, res);
    });

    test("Test 1: Setting Van status", () => {
        expect(res.send).toHaveBeenCalledTimes(1);
        expect(res.send).toHaveBeenCalledWith("Van not found");
    })


});