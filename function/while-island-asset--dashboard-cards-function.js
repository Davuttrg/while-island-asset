import { database, ObjectId } from "@spica-devkit/database";

const CITY_BUCKET = process.env.CITY_BUCKET_ID;
const COUNTRY_BUCKET = process.env.COUNTRY_BUCKET_ID;
const PRODUCT_BUCKET = process.env.PRODUCT_BUCKET_ID;
const CITY_SYSTEM_BUCKET = process.env.CITY_SYSTEM_BUCKET_ID;
const WAR_BUCKET = process.env.WAR_BUCKET_ID;
const AGREEMENT_BUCKET = process.env.AGREEMENT_BUCKET_ID;
const EMBARGO_BUCKET = process.env.EMBARGO_BUCKET_ID;
const NEWS_BUCKET = process.env.NEWS_BUCKET_ID;
const USER_PRODUCT_BUCKET = process.env.USER_PRODUCT_BUCKET_ID;
const USER_BUCKET = process.env.USER_BUCKET_ID;



const PUBLIC_URL = process.env.__INTERNAL__SPICA__PUBLIC_URL__;

let db;
const checkDigits = (element) => element.toString().split(".")[1] ? Number(element.toString().split(".")[0] + "." + element.toString().split(".")[1].substr(0, 3)) : Number(element);

const checkNumber = (value) => Number(value) ? Number(value) : value;
const clearString = (value) => value.split("*")[1] || value.split("*")[0];
const clearReqBody = (body) => {
    Object.keys(body).map((field) => {
        if (field.split('*')[1]) {
            if (body[field.split('*')[1]]) {
                body[field.split('*')[1]] = Array.isArray(body[field.split('*')[1]]) ? body[field.split('*')[1]] : [body[field.split('*')[1]]]
                body[field.split('*')[1]] = [...body[field.split('*')[1]], field.split('*')[0]]
            } else body[field.split('*')[1]] = field.split('*')[0]
            delete body[field]
        }
    })
    return body;
}
export async function addCityDashboard() {

    if (!db) db = await database()
    let country_collection = db.collection(`bucket_${COUNTRY_BUCKET}`);
    let product_collection = db.collection(`bucket_${PRODUCT_BUCKET}`)
    let countries = await country_collection.find().toArray();
    let products = await product_collection.find().toArray();
    let producstInput = [];
    products.map((item) => {
        producstInput = [...producstInput, {
            key: item._id.toString() + "*product",
            type: "string",
            value: item.title,
            title: "Product",
        }, {
            key: "count",
            type: "number",
            value: null,
            title: "Count",
        }, {
            key: "consumption_rate",
            type: "number",
            value: null,
            title: "Consumption Rate",
        },
        {
            key: "production_rate",
            type: "number",
            value: null,
            title: "Production Rate",
        },
        // {
        //     key: "purchase_price",
        //     type: "number",
        //     value: null,
        //     title: "Purchase Price",
        // }, {
        //     key: "sale_price",
        //     type: "number",
        //     value: null,
        //     title: "Sale Price",
        // },
        {
            key: "storage",
            type: "number",
            value: null,
            title: "Storage",
        },
        ]
    });
    return {
        title: "Add City",
        description:
            "Fill in all fields to automate processes ",
        inputs: [
            {
                key: "title",
                type: "string",
                value: "",
                title: "Name",
            },
            {
                key: "country",
                type: "multiselect",
                items: {
                    type: "string",
                    enum: countries.map((item) => item.title + '*' + item._id),
                },
                value: countries[0].title + '*' + countries[0]._id,
                title: "Country",
                maxItems: 1
            },
            {
                key: "population",
                type: "number",
                value: null,
                title: "Population",
            },
            ...producstInput,

        ],
        button: {
            color: "primary",
            target: `${PUBLIC_URL}/fn-execute/createCityFromDashboard`,
            method: "post",
            title: "Create City",
        },
    };
}
export async function createCityFromDashboard(req, res) {
    if (!db) db = await database()
    const city_collection = db.collection(`bucket_${CITY_BUCKET}`);
    const city_system_collection = db.collection(`bucket_${CITY_SYSTEM_BUCKET}`);
    const product_collection = db.collection(`bucket_${PRODUCT_BUCKET}`);
    const products = await product_collection.find().toArray();

    const newCity = await city_collection.insertOne({
        title: req.body['title'],
        country: clearString(req.body['country']),
        population: checkNumber(req.body['population']),
    });

    let { title, country, population, ...newBody } = req.body

    const citySystems = [];
    let obj = {};
    newBody = clearReqBody(newBody);
    console.log("products :", products)
    newBody.count.forEach((_, i) => {
        Object.keys(newBody).forEach((field) => {
            obj[field] = checkNumber(newBody[field][i]);
        })
        obj['city'] = newCity.insertedId.toString();
        const product = products.find((product) => product._id.toString() == obj["product"]);
        console.log("product ", product)
        let { sale_price, purchase_price } = getChangedPrices(obj["count"], obj["storage"], product.base_price);
        console.log("sale_price, purchase_price :", sale_price, purchase_price)
        obj["sale_price"] = checkDigits(sale_price);
        obj["purchase_price"] = checkDigits(purchase_price)
        citySystems.push(obj);
        obj = {};
    })
    await city_system_collection.insertMany(citySystems);
    return {}
}


export async function addProductDashboard() {

    if (!db) db = await database()
    let city_collection = db.collection(`bucket_${CITY_BUCKET}`);
    let cities = await city_collection.find().toArray();
    let citiesInput = [];
    cities.map((item) => {
        citiesInput = [...citiesInput, {
            key: item._id.toString() + "*city",
            type: "string",
            value: item.title,
            title: "City",
        }, {
            key: "count",
            type: "number",
            value: null,
            title: "Count",
        }, {
            key: "consumption_rate",
            type: "number",
            value: null,
            title: "Consumption Rate",
        },
        {
            key: "production_rate",
            type: "number",
            value: null,
            title: "Production Rate",
        },
        // {
        //     key: "purchase_price",
        //     type: "number",
        //     value: null,
        //     title: "Purchase Price",
        // }, {
        //     key: "sale_price",
        //     type: "number",
        //     value: null,
        //     title: "Sale Price",
        // },
        {
            key: "storage",
            type: "number",
            value: null,
            title: "Storage",
        },]
    });
    return {
        title: "Add Product",
        description:
            "Fill in all fields to automate processes ",
        inputs: [
            {
                key: "title",
                type: "string",
                value: "",
                title: "Name",
            },
            {
                key: "description",
                type: "string",
                value: "",
                title: "Description",
            },
            {
                key: "base_price",
                type: "number",
                value: null,
                title: "Base Price",
            },
            ...citiesInput,
        ],
        button: {
            color: "primary",
            target: `${PUBLIC_URL}/fn-execute/createProductFromDashboard`,
            method: "post",
            title: "Create Product",
        },
    };
}

export async function createProductFromDashboard(req, res) {
    if (!db) db = await database()
    const product_collection = db.collection(`bucket_${PRODUCT_BUCKET}`)
    const city_system_collection = db.collection(`bucket_${CITY_SYSTEM_BUCKET}`);
    const user_product_collection = db.collection(`bucket_${USER_PRODUCT_BUCKET}`);
    const user_collection = db.collection(`bucket_${USER_BUCKET}`)
    const newProduct = await product_collection.insertOne({
        title: req.body['title'],
        description: req.body.description,
        base_price: Number(req.body.base_price)
    });
    let { title, description, base_price, ...newBody } = req.body
    newBody = clearReqBody(newBody);
    const citySystems = [];
    let obj = {};
    newBody.count.forEach((_, i) => {
        Object.keys(newBody).forEach((field) => {
            obj[field] = checkNumber(newBody[field][i]);
        })
        obj['product'] = newProduct.insertedId.toString();
        let { sale_price, purchase_price } = getChangedPrices(obj["count"], obj["storage"], req.body.base_price);
        obj["sale_price"] = checkDigits(sale_price);
        obj["purchase_price"] = checkDigits(purchase_price)
        citySystems.push(obj);
        obj = {};
    })
    await city_system_collection.insertMany(citySystems);
    const users = await user_collection.find().toArray();
    await user_product_collection.insertMany(users.map((item => {
        return { product: newProduct.insertedId.toString(), user: item._id.toString(), amount: 0, updated_at: new Date() }
    })));
    return {}
}

export async function createWarDashboard() {

    if (!db) db = await database()
    let country_collection = db.collection(`bucket_${COUNTRY_BUCKET}`);
    let countries = await country_collection.find().toArray();

    return {
        title: "Create War",
        description:
            "Fill in all fields to automate processes ",
        inputs: [
            {
                key: "title",
                type: "string",
                value: "",
                title: "Title",
            },
            {
                key: "description",
                type: "string",
                value: "",
                title: "Description",
            },
            {
                key: "left_sides",
                type: "multiselect",
                items: {
                    type: "string",
                    enum: countries.map((item) => item.title + '*' + item._id),
                },
                value: countries[0].title + '*' + countries[0]._id,
                title: "Left Sides",
            },
            {
                key: "left_side_production_reduction_rate",
                type: "number",
                value: null,
                title: "Left Side Production Reduction Rate",
            },

            {
                key: "right_sides",
                type: "multiselect",
                items: {
                    type: "string",
                    enum: countries.map((item) => item.title + '*' + item._id),
                },
                value: countries[0].title + '*' + countries[0]._id,
                title: "Right Sides",
            },
            {
                key: "right_side_production_reduction_rate",
                type: "number",
                value: null,
                title: "Right Side Production Reduction Rate",
            },
        ],
        button: {
            color: "primary",
            target: `${PUBLIC_URL}/fn-execute/createWarFromDashboard`,
            method: "post",
            title: "Create War",
        },
    };
}
export async function createWarFromDashboard(req, res) {
    if (!db) db = await database()
    let war_collection = db.collection(`bucket_${WAR_BUCKET}`);
    addNews(
        {
            title:
                `${req.body['left_sides'].split(",").map((item) => item.split("*")[0])} entered the war with ${req.body['right_sides'].split(",").map((item) => item.split("*")[0])}.`,
            description: "", subject: "war", for_subscribers: true
        });
    Object.keys(req.body).forEach((field) => {
        req.body[field] = req.body[field].split("*")[1] ? req.body[field].split(",").map((item) => ObjectId(item.split("*")[1])) : checkNumber(req.body[field])
    })
    req.body['in_war'] = true;
    await war_collection.insertOne(req.body)

    return {}
}


export async function createAgreementDashboard() {

    if (!db) db = await database()
    let country_collection = db.collection(`bucket_${COUNTRY_BUCKET}`);
    let product_collection = db.collection(`bucket_${PRODUCT_BUCKET}`)
    let countries = await country_collection.find().toArray();
    let products = await product_collection.find().toArray()
    return {
        title: "Create Agreement",
        description:
            "Fill in all fields to automate processes ",
        inputs: [
            {
                key: "title",
                type: "string",
                value: "",
                title: "Title",
            },
            {
                key: "description",
                type: "string",
                value: "",
                title: "Description",
            },

            {
                key: "product",
                type: "multiselect",
                items: {
                    type: "string",
                    enum: products.map((item) => item.title + '*' + item._id),
                },
                value: products[0].title + '*' + products[0]._id,
                title: "Product",
                maxItems: 1
            },
            {
                key: "contracted_country",
                type: "multiselect",
                items: {
                    type: "string",
                    enum: countries.map((item) => item.title + '*' + item._id),
                },
                value: countries[0].title + '*' + countries[0]._id,
                title: "Contracted Country",
                maxItems: 1
            },
            {
                key: "contracting_country",
                type: "multiselect",
                items: {
                    type: "string",
                    enum: countries.map((item) => item.title + '*' + item._id),
                },
                value: countries[0].title + '*' + countries[0]._id,
                title: "Contracting Country",
                maxItems: 1
            },
            {
                key: "agreement_rating",
                type: "number",
                value: null,
                title: "Agreement Rating",
            },
        ],
        button: {
            color: "primary",
            target: `${PUBLIC_URL}/fn-execute/createAgreementFromDashboard`,
            method: "post",
            title: "Create Agreement",
        },
    };
}
export async function createAgreementFromDashboard(req, res) {
    if (!db) db = await database()
    let agreement_collection = db.collection(`bucket_${AGREEMENT_BUCKET}`);
    addNews(
        {
            title:
                `${req.body.contracting_country.split("*")[0]} entered the agreement with  ${req.body.contracted_country.split("*")[0]}.`,
            description: "", subject: "agreement", for_subscribers: true
        });
    Object.keys(req.body).forEach((field) => {
        req.body[field] = req.body[field].split("*")[1] ? req.body[field].split(",").leng > 1 ? req.body[field].split(",").map((item) => ObjectId(item.split("*")[1])) : ObjectId(req.body[field].split("*")[1]) : checkNumber(req.body[field])
    })
    await agreement_collection.insertOne(req.body)

    return {}
}


export async function createEmbargoDashboard() {
    if (!db) db = await database()
    let country_collection = db.collection(`bucket_${COUNTRY_BUCKET}`);
    let product_collection = db.collection(`bucket_${PRODUCT_BUCKET}`)
    let countries = await country_collection.find().toArray();
    let products = await product_collection.find().toArray()
    return {
        title: "Create Embargo",
        description:
            "Fill in all fields to automate processes ",
        inputs: [
            {
                key: "title",
                type: "string",
                value: "",
                title: "Title",
            },
            {
                key: "description",
                type: "string",
                value: "",
                title: "Description",
            },

            {
                key: "multiproducts",
                type: "multiselect",
                items: {
                    type: "string",
                    enum: products.map((item) => item.title + '*' + item._id),
                },
                value: products[0].title + '*' + products[0]._id,
                title: "Products",
            },
            {
                key: "embargoed_country",
                type: "multiselect",
                items: {
                    type: "string",
                    enum: countries.map((item) => item.title + '*' + item._id),
                },
                value: countries[0].title + '*' + countries[0]._id,
                title: "Embargoed Country",
                maxItems: 1
            },
            {
                key: "embargoing_country",
                type: "multiselect",
                items: {
                    type: "string",
                    enum: countries.map((item) => item.title + '*' + item._id),
                },
                value: countries[0].title + '*' + countries[0]._id,
                title: "Embargoing Country",
                maxItems: 1
            },
            {
                key: "deleted_product_rate",
                type: "number",
                value: null,
                title: "Deleted Product Rate",
            },
            {
                key: "consumption_rate_decrease",
                type: "number",
                value: null,
                title: "Consumption Rate Decrease",
            },

        ],
        button: {
            color: "primary",
            target: `${PUBLIC_URL}/fn-execute/createEmbargoFromDashboard`,
            method: "post",
            title: "Create Embargo",
        },
    };
}
export async function createEmbargoFromDashboard(req, res) {
    if (!db) db = await database()
    let embargo_collection = db.collection(`bucket_${EMBARGO_BUCKET}`);
    addNews(
        {
            title:
                `${req.body.embargoing_country.split("*")[0]} entered the embargo with  ${req.body.embargoed_country.split("*")[0]}.`,
            description: "", subject: "embargo", for_subscribers: true
        });
    Object.keys(req.body).forEach((field) => {
        req.body[field] = req.body[field].split("*")[1] ? req.body[field].split(",").leng > 1 || field.split("multi")[1] ? req.body[field].split(",").map((item) => ObjectId(item.split("*")[1])) : ObjectId(req.body[field].split("*")[1]) : checkNumber(req.body[field]);
        if (field.split("multi")[1]) { req.body[field.split("multi")[1]] = req.body[field]; delete req.body[field] }
    })
    await embargo_collection.insertOne(req.body);

    return {}
}

async function addNews(data) {
    if (!db) db = await database();
    let news_collection = db.collection(`bucket_${NEWS_BUCKET}`);
    await news_collection.insertOne(data)
}
function getChangedPrices(count, storage, base_price) {
    const sale_price = Number(base_price) *( Math.pow(2, (1 - Math.log2(Number(count) / Number(storage)))) - 1)
    return {
        sale_price: sale_price > 0 ? sale_price : 0,
        purchase_price: sale_price - (sale_price * 0.03) > 0 ? sale_price - (sale_price * 0.03) : 0
    }
}