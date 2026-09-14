import { onRequestDelete as __api_days__id__js_onRequestDelete } from "C:\\Users\\bruno\\OneDrive\\Desktop\\Proyectos\\Calendario_de_Amor\\functions\\api\\days\\[id].js"
import { onRequestPut as __api_days__id__js_onRequestPut } from "C:\\Users\\bruno\\OneDrive\\Desktop\\Proyectos\\Calendario_de_Amor\\functions\\api\\days\\[id].js"
import { onRequestDelete as __api_days_days__id__js_onRequestDelete } from "C:\\Users\\bruno\\OneDrive\\Desktop\\Proyectos\\Calendario_de_Amor\\functions\\api\\days\\days-[id].js"
import { onRequestPut as __api_days_days__id__js_onRequestPut } from "C:\\Users\\bruno\\OneDrive\\Desktop\\Proyectos\\Calendario_de_Amor\\functions\\api\\days\\days-[id].js"
import { onRequestGet as __api_days_js_onRequestGet } from "C:\\Users\\bruno\\OneDrive\\Desktop\\Proyectos\\Calendario_de_Amor\\functions\\api\\days.js"
import { onRequestPost as __api_days_js_onRequestPost } from "C:\\Users\\bruno\\OneDrive\\Desktop\\Proyectos\\Calendario_de_Amor\\functions\\api\\days.js"

export const routes = [
    {
      routePath: "/api/days/:id",
      mountPath: "/api/days",
      method: "DELETE",
      middlewares: [],
      modules: [__api_days__id__js_onRequestDelete],
    },
  {
      routePath: "/api/days/:id",
      mountPath: "/api/days",
      method: "PUT",
      middlewares: [],
      modules: [__api_days__id__js_onRequestPut],
    },
  {
      routePath: "/api/days/days-:id",
      mountPath: "/api/days",
      method: "DELETE",
      middlewares: [],
      modules: [__api_days_days__id__js_onRequestDelete],
    },
  {
      routePath: "/api/days/days-:id",
      mountPath: "/api/days",
      method: "PUT",
      middlewares: [],
      modules: [__api_days_days__id__js_onRequestPut],
    },
  {
      routePath: "/api/days",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_days_js_onRequestGet],
    },
  {
      routePath: "/api/days",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_days_js_onRequestPost],
    },
  ]