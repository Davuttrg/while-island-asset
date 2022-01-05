import { database, ObjectId } from "@spica-devkit/database";
const CITY_SYSTEM_BUCKET = process.env.CITY_SYSTEM_BUCKET_ID;
const CITY_BUCKET = process.env.CITY_BUCKET_ID;
const WAR_BUCKET = process.env.WAR_BUCKET_ID;
const AGREEMENT_BUCKET = process.env.AGREEMENT_BUCKET_ID;
const EMBARGO_BUCKET = process.env.EMBARGO_BUCKET_ID;
const PRODUCT_BUCKET = process.env.PRODUCT_BUCKET_ID;


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
        const { sale_price, purchase_price } = getChangedPrices(item.count, item.storage, product.base_price);
        promises.push(city_system_collection.updateOne(
            { _id: ObjectId(item._id) },
            {
                $set: {
                    "count": item.count > 0 ? item.count > item.storage ? item.storage : checkDigits(item.count) : 0,
                    "sale_price": checkDigits(sale_price),
                    "purchase_price": checkDigits(purchase_price)
                }
            }
        ).catch((e) => console.log("default function error :", e)))
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
            ))
        })
    }
    await Promise.all(promises).then((res) => console.log("checkWar function res :", res)).catch((e) => console.log("checkWar function error :", e))
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
            ))
        });
        contractingCitiesData.forEach((data) => {
            data.production_rate += data.production_rate * agreement.agreement_rating;
            promises.push(city_system_collection.updateOne(
                { _id: ObjectId(data._id) },
                { $set: { "production_rate": data.production_rate > 0 ? checkDigits(data.production_rate) : 0 } }
            ))
        })
    }
    await Promise.all(promises).then((res) => console.log("checkAgreement function res :", res)).catch((e) => console.log("checkAgreement function error :", e))
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
                        "count": item.count > 0 ? checkDigits(item.count) : 0
                    }
                }
            ))
        })
    }
    await Promise.all(promises).then((res) => console.log("checkEmbargo function es :", res)).catch((e) => console.log("checkEmbargo function error :", e))
    return {}
}

function getChangedPrices(count, storage, base_price) {
    const sale_price = Number(base_price) *( Math.pow(2, (1 - Math.log2(Number(count) / Number(storage)))) - 1)
    return {
        sale_price: sale_price > 0 ? sale_price : 0,
        purchase_price: sale_price - (sale_price * 0.03) > 0 ? sale_price - (sale_price * 0.03) : 0
    }
}
export async function tradeEvent(req, res) {
    const { user, product, count, type } = req.body;

}
