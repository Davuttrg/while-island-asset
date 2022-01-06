import { database, ObjectId } from "@spica-devkit/database";
const CITY_SYSTEM_BUCKET = process.env.CITY_SYSTEM_BUCKET_ID;
const CITY_BUCKET = process.env.CITY_BUCKET_ID;
const WAR_BUCKET = process.env.WAR_BUCKET_ID;
const AGREEMENT_BUCKET = process.env.AGREEMENT_BUCKET_ID;
const EMBARGO_BUCKET = process.env.EMBARGO_BUCKET_ID;
const PRODUCT_BUCKET = process.env.PRODUCT_BUCKET_ID;
const USER_BUCKET = process.env.USER_BUCKET_ID;
const ORDER_BUCKET = process.env.ORDER_BUCKET_ID;





let db;
const checkDigits = (element) => element.toString().split(".")[1] ? Number(element.toString().split(".")[0] + "." + element.toString().split(".")[1].substr(0, 3)) : Number(element);
export default async function () {
    if (!db) db = await database()
    const city_system_collection = db.collection(`bucket_${CITY_SYSTEM_BUCKET}`);
    const city_collection = db.collection(`bucket_${CITY_BUCKET}`);
    const product_collection = db.collection(`bucket_${PRODUCT_BUCKET}`);
    const data = await city_system_collection.find({ count: { $gt: 0 } }).toArray();
    const uniqueCitiesForSearc = Array.from(new Set(data.map((item) => item.city)))
    const cities = await city_collection.find({
        _id: { $in: uniqueCitiesForSearc.map((item) => ObjectId(item)) }
    }).toArray();
    const uniqueProductsForSearc = Array.from(new Set(data.map((item) => item.product)))
    const products = await product_collection.find({
        _id: { $in: uniqueProductsForSearc.map((item) => ObjectId(item)) }
    }).toArray();
    const promises = [];
    data.forEach((item) => {
        const city = cities.find((city) => city._id.toString() == item.city);
        const product = products.find((product) => product._id.toString() == item.product);
        item.count += (city.population * item.production_rate) - (city.population * item.consumption_rate);
        promises.push(updateCitySystemPrices(item.count, item.storage, product.base_price))
    })
    await Promise.all(promises).then((res) => console.log("default function res :", res))
    return {}
}
export async function checkWar() {
    if (!db) db = await database()
    let city_system_collection = db.collection(`bucket_${CITY_SYSTEM_BUCKET}`);
    let war_collection = db.collection(`bucket_${WAR_BUCKET}`);
    let city_collection = db.collection(`bucket_${CITY_BUCKET}`);
    let wars = await war_collection.find({ in_war: true }).toArray();
    let promises = [];
    for (const war of wars) {
        let cities = await city_collection.find({ country: { $in: war.left_sides.concat(war.right_sides) } }).toArray(); //one query
        let data = await city_system_collection.find({ city: { $in: cities.map((item) => item._id.toString()) } }).toArray();
        let leftSideCitiesData = data.filter((item) => cities.filter((item) => war.left_sides.includes(item.country)).some((item2) => item.city == item2._id.toString()));
        let rightSideCitiesData = data.filter((item) => cities.filter((item) => war.right_sides.includes(item.country)).some((item2) => item.city == item2._id.toString()))
        leftSideCitiesData.forEach((data) => {
            data.production_rate -= data.production_rate * war.left_side_production_reduction_rate;
            promises.push(city_system_collection.updateOne(
                { _id: ObjectId(data._id) },
                { $set: { "production_rate": data.production_rate > 0 ? checkDigits(data.production_rate) : 0 } }
            ))
        })
        rightSideCitiesData.forEach((data) => {
            data.production_rate -= data.production_rate * war.right_side_production_reduction_rate;
            promises.push(city_system_collection.updateOne(
                { _id: ObjectId(data._id) },
                { $set: { "production_rate": data.production_rate > 0 ? checkDigits(data.production_rate) : 0 } }
            ).catch((e) => console.log("checkWar function error :", e)))
        })
    }
    await Promise.all(promises).then((res) => console.log("checkWar function res :", res));
    return {}
}
export async function checkAgreement() {
    if (!db) db = await database()
    let city_system_collection = db.collection(`bucket_${CITY_SYSTEM_BUCKET}`);
    let agreement_collection = db.collection(`bucket_${AGREEMENT_BUCKET}`);
    let city_collection = db.collection(`bucket_${CITY_BUCKET}`);
    let agreements = await agreement_collection.find({ in_agreement: true }).toArray();
    let promises = [];
    for (const agreement of agreements) {
        let cities = await city_collection.find({ country: { $in: [agreement.contracted_country, agreement.contracting_country] } }).toArray(); //one query
        let data = await city_system_collection.find({ city: { $in: cities.map((item) => item._id.toString()) } }).toArray();
        let contractedCitiesData = data.filter((item) => cities.filter((item) => agreement.contracted_country == item.country).some((item2) => item.city == item2._id.toString()));
        let contractingCitiesData = data.filter((item) => cities.filter((item) => agreement.contracting_country == item.country).some((item2) => item.city == item2._id.toString()))
        contractedCitiesData.forEach((data) => {
            data.production_rate -= data.production_rate * agreement.agreement_rating;
            promises.push(city_system_collection.updateOne(
                { _id: ObjectId(data._id) },
                { $set: { "production_rate": data.production_rate > 0 ? checkDigits(data.production_rate) : 0 } }
            ).catch((e) => console.log("checkAgreement function error :", e)))
        });
        contractingCitiesData.forEach((data) => {
            data.production_rate += data.production_rate * agreement.agreement_rating;
            promises.push(city_system_collection.updateOne(
                { _id: ObjectId(data._id) },
                { $set: { "production_rate": data.production_rate > 0 ? checkDigits(data.production_rate) : 0 } }
            ))
        })
    }
    await Promise.all(promises).then((res) => console.log("checkAgreement function res :", res))
    return {}
}
export async function checkEmbargo() {
    if (!db) db = await database()
    let city_system_collection = db.collection(`bucket_${CITY_SYSTEM_BUCKET}`);
    let embargo_collection = db.collection(`bucket_${EMBARGO_BUCKET}`);
    let city_collection = db.collection(`bucket_${CITY_BUCKET}`);
    let embargos = await embargo_collection.find({ in_embargo: true }).toArray();
    let promises = [];

    for (const embargo of embargos) {
        let cities = await city_collection.find({ country: embargo.embargoed_country }).toArray(); //one query
        let data = await city_system_collection.find({ $and: [{ city: { $in: cities.map((item) => item._id.toString()) } }, { product: { $in: embargo.products } }] }).toArray();
        data.forEach((item) => {
            if (item.consumption_rate > 0) item.consumption_rate -= item.consumption_rate * embargo.consumption_rate_decrease;
            if (item.count > 0) item.count -= item.count * embargo.deleted_product_rate;
            promises.push(city_system_collection.updateOne(
                { _id: ObjectId(item._id) },
                {
                    $set: {
                        "consumption_rate": item.consumption_rate > 0 ? checkDigits(item.consumption_rate) : 0,
                        "count": item.count > 0 ? Math.floor(checkDigits(item.count)) : 0
                    }
                }
            ).catch((e) => console.log("checkEmbargo function error :", e)))
        })
    }
    await Promise.all(promises).then((res) => console.log("checkEmbargo function es :", res)).catch((e) => console.log("checkEmbargo function error :", e))
    return {}
}

function getChangedPrices(count, storage, base_price, amount) {
    let sale_price;

    if (amount) {
        {
            sale_price = Number(amount) * Number(base_price) *
                (Math.pow(2, (1 - ((Math.log2(Number(count) / Number(storage)) + Math.log2((Number(count) - Number(amount)) / Number(storage))) / 2))) - 1)
        }
    } else
        sale_price = Number(base_price) * (Math.pow(2, (1 - Math.log2(Number(count) / Number(storage)))) - 1)
    return {
        sale_price: sale_price > 0 ? checkDigits(sale_price) : 0,
        purchase_price: sale_price - (sale_price * 0.03) > 0 ? checkDigits(sale_price - (sale_price * 0.03)) : 0
    }
}


export async function orderEvent(req, res) {
    const { orderType, owner, id, amount, createTime, product, cityId } = req.body;
    if (!db) db = await database()
    const product_collection = db.collection(`bucket_${PRODUCT_BUCKET}`);
    const order_collection = db.collection(`bucket_${ORDER_BUCKET}`);
    const user_collection = db.collection(`bucket_${USER_BUCKET}`);
    const city_system_collection = db.collection(`bucket_${CITY_SYSTEM_BUCKET}`);

    const productData = await product_collection.findOne(ObjectId(product)).catch((e) => console.log("err :", e));
    const userData = await user_collection.findOne({ wallet: owner }).catch((e) => console.log("err :", e));
    const citySystemData = await city_system_collection.findOne({ product: product, city: cityId })
    const orderObj = {
        id: id,
        order_type: orderType,
        user: userData._id.toString(),
        product: productData._id.toString(),
        amount: amount,
        created_at: new Date(createTime),
        city: cityId
    }
    switch (Number(orderType)) {
        case 0: //sale
            orderObj['price'] = checkDigits(citySystemData.purchase_price * amount);
            break;
        case 1: //buy
            const { sale_price } = getChangedPrices(citySystemData.count, citySystemData.storage, citySystemData.sale_price, amount);
            orderObj['price'] = sale_price;
            break;
    };
    const newCount = Number(orderType) == 0 ? citySystemData.count - Number(amount) : citySystemData.count + Number(amount);
    await updateCitySystemPrices(citySystemData._id.toString(), newCount, citySystemData.storage, productData.base_price);
    await order_collection.insertOne(orderObj).catch((e) => console.log("default function error :", e));
    return res.status(200).send({ message: "Okay" })

}

async function updateCitySystemPrices(id, count, storage, base_price) {
    if (!db) db = await database()
    const city_system_collection = db.collection(`bucket_${CITY_SYSTEM_BUCKET}`);
    const { sale_price, purchase_price } = getChangedPrices(count, storage, base_price);
    return city_system_collection.updateOne(
        { _id: ObjectId(id) },
        {
            $set: {
                "count": count > 0 ? count > storage ? storage : Math.floor(checkDigits(count)) : 0,
                "sale_price": sale_price,
                "purchase_price": purchase_price
            }
        }
    ).catch((e) => console.log("default function error :", e));
}
