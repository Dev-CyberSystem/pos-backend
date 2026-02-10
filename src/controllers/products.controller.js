// import { asyncHandler } from "../utils/asyncHandler.js";
// import * as service from "../services/products.service.js";

// export const create = asyncHandler(async (req, res) => {
//   const product = await service.createProduct(req.body);
//   res.status(201).json({ ok: true, data: product });
// });

// export const getById = asyncHandler(async (req, res) => {
//   const product = await service.getProductById(req.params.id);
//   res.json({ ok: true, data: product });
// });

// export const update = asyncHandler(async (req, res) => {
//   const product = await service.updateProduct(req.params.id, req.body);
//   res.json({ ok: true, data: product });
// });

// export const toggleActive = asyncHandler(async (req, res) => {
//   const product = await service.toggleActive(req.params.id);
//   res.json({ ok: true, data: product });
// });

// export const list = asyncHandler(async (req, res) => {
//   const data = await service.listProducts(req.query);
//   res.json({ ok: true, ...data });
// });
import { asyncHandler } from "../utils/asyncHandler.js";
import * as service from "../services/products.service.js";

export const list = asyncHandler(async (req, res) => {
  const q = req.query.q || "";
  const active = req.query.active;
  const activeBool =
    active === undefined ? undefined : (active === "true" ? true : active === "false" ? false : undefined);

  const items = await service.listProducts({ q, active: activeBool });
  res.json({ ok: true, data: items });
});

export const getById = asyncHandler(async (req, res) => {
  const item = await service.getProduct(req.params.id);
  res.json({ ok: true, data: item });
});

export const create = asyncHandler(async (req, res) => {
  const item = await service.createProduct(req.body);
  res.status(201).json({ ok: true, data: item });
});

export const update = asyncHandler(async (req, res) => {
  const item = await service.updateProduct(req.params.id, req.body);
  res.json({ ok: true, data: item });
});

export const remove = asyncHandler(async (req, res) => {
  const item = await service.deactivateProduct(req.params.id);
  res.json({ ok: true, data: item });
});
