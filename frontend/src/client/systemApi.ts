/**
 * System API Services - Manual API client for the robot management platform.
 * Uses axios with the same OpenAPI config for auth headers.
 */
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"
import type { CancelablePromise } from "./core/CancelablePromise"

// ========== Types ==========

export interface RobotPublic {
    id: string
    name: string
    code: string
    ip: string | null
    created_at: string | null
    updated_at: string | null
    last_heartbeat: string | null
    robot_state: number
    current_task: string | null
    latitude: string | null
    longitude: string | null
    is_online: boolean
}

export interface RobotsPublic {
    data: RobotPublic[]
    count: number
}

export interface RobotCreate {
    name: string
    code: string
    ip?: string
}

export interface RobotUpdate {
    name?: string
    code?: string
    ip?: string
}

export interface PersonInfoPublic {
    id: string
    name: string
    gender: string
    age: number
    height: string | null
    weight: string | null
    card_id: string
    soldier_id: string
    category_name: string
    category: string
    difficulty: string
    title: string | null
    disease: string | null
    bucankao: string | null
    bmi: string | null
    pbf: string | null
    sys_org_code: string | null
    created_at: string | null
    updated_at: string | null
    del_flag: string
    avatar_path: string | null
}

export interface PersonsPublic {
    data: PersonInfoPublic[]
    count: number
}

export interface PersonInfoCreate {
    name: string
    gender: string
    age: number
    height?: string
    weight?: string
    card_id: string
    soldier_id: string
    category_name: string
    category: string
    difficulty: string
    title?: string
    disease?: string
    sys_org_code?: string
}

export interface PersonInfoUpdate {
    name?: string
    gender?: string
    age?: number
    height?: string
    weight?: string
    card_id?: string
    soldier_id?: string
    category_name?: string
    category?: string
    difficulty?: string
    title?: string
    disease?: string
    sys_org_code?: string
}

export interface BatchUpdateRequest {
    ids: string[]
    category?: string
    category_name?: string
    difficulty?: string
    age?: number
    sys_org_code?: string
}

export interface OrganizationPublic {
    id: string
    name: string
    code: string | null
    parent_id: string | null
    sort_order: number
    created_at: string | null
    updated_at: string | null
}

export interface OrganizationTree extends OrganizationPublic {
    children: OrganizationTree[]
}

export interface OrganizationsPublic {
    data: OrganizationPublic[]
    count: number
}

export interface OrganizationCreate {
    name: string
    code?: string
    parent_id?: string
    sort_order?: number
}

export interface OrganizationUpdate {
    name?: string
    code?: string
    parent_id?: string
    sort_order?: number
}

export interface DictTypePublic {
    id: string
    name: string
    code: string
    description: string | null
    created_at: string | null
}

export interface DictTypesPublic {
    data: DictTypePublic[]
    count: number
}

export interface DictItemPublic {
    id: string
    label: string
    value: string
    sort_order: number
    dict_type_id: string
    created_at: string | null
}

export interface DictItemsPublic {
    data: DictItemPublic[]
    count: number
}

export interface DictTypeWithItems extends DictTypePublic {
    items: DictItemPublic[]
}

export interface DictTypeCreate {
    name: string
    code: string
    description?: string
}

export interface DictTypeUpdate {
    name?: string
    code?: string
    description?: string
}

export interface DictItemCreate {
    label: string
    value: string
    sort_order?: number
    dict_type_id: string
}

export interface DictItemUpdate {
    label?: string
    value?: string
    sort_order?: number
}

export interface SystemLogPublic {
    id: string
    log_type: string
    level: string
    message: string
    source: string | null
    robot_code: string | null
    created_at: string | null
}

export interface SystemLogsPublic {
    data: SystemLogPublic[]
    count: number
}

export interface CommandRequest {
    command: string
    robot_codes: string[]
}

export interface Message {
    message: string
}

// ========== Stats ==========

export interface DashboardStats {
    totalPersons: number
    totalRobots: number
    onlineRobots: number
    examiningRobots: number
}

// ========== Services ==========

export class RobotService {
    public static readRobots(data: { skip?: number; limit?: number; search?: string } = {}): CancelablePromise<RobotsPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/system/robots/",
            query: { skip: data.skip, limit: data.limit, search: data.search },
        })
    }

    public static createRobot(data: { requestBody: RobotCreate }): CancelablePromise<RobotPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/system/robots/",
            body: data.requestBody,
            mediaType: "application/json",
        })
    }

    public static updateRobot(data: { id: string; requestBody: RobotUpdate }): CancelablePromise<RobotPublic> {
        return __request(OpenAPI, {
            method: "PUT",
            url: `/api/v1/system/robots/${data.id}`,
            body: data.requestBody,
            mediaType: "application/json",
        })
    }

    public static deleteRobot(data: { id: string }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: `/api/v1/system/robots/${data.id}`,
        })
    }

    public static batchDeleteRobots(data: { ids: string[] }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/system/robots/batch-delete",
            body: data.ids,
            mediaType: "application/json",
        })
    }

    public static sendCommand(data: { code: string; command: string }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: `/api/v1/system/robots/${data.code}/command`,
            body: { command: data.command, robot_codes: [] },
            mediaType: "application/json",
        })
    }

    public static sendBatchCommand(data: { command: string; robot_codes: string[] }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/system/robots/batch-command",
            body: { command: data.command, robot_codes: data.robot_codes },
            mediaType: "application/json",
        })
    }
}

export class PersonService {
    public static readPersons(data: { skip?: number; limit?: number; search?: string; org_id?: string } = {}): CancelablePromise<PersonsPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/system/persons/",
            query: { skip: data.skip, limit: data.limit, search: data.search, org_id: data.org_id },
        })
    }

    public static createPerson(data: { requestBody: PersonInfoCreate }): CancelablePromise<PersonInfoPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/system/persons/",
            body: data.requestBody,
            mediaType: "application/json",
        })
    }

    public static updatePerson(data: { id: string; requestBody: PersonInfoUpdate }): CancelablePromise<PersonInfoPublic> {
        return __request(OpenAPI, {
            method: "PUT",
            url: `/api/v1/system/persons/${data.id}`,
            body: data.requestBody,
            mediaType: "application/json",
        })
    }

    public static deletePerson(data: { id: string }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: `/api/v1/system/persons/${data.id}`,
        })
    }

    public static batchDeletePersons(data: { ids: string[] }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/system/persons/batch-delete",
            body: data.ids,
            mediaType: "application/json",
        })
    }

    public static batchUpdatePersons(data: { requestBody: BatchUpdateRequest }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/system/persons/batch-update",
            body: data.requestBody,
            mediaType: "application/json",
        })
    }
}

export class OrgService {
    public static readOrganizations(data: { skip?: number; limit?: number } = {}): CancelablePromise<OrganizationsPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/system/org/",
            query: { skip: data.skip, limit: data.limit },
        })
    }

    public static readTree(): CancelablePromise<OrganizationTree[]> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/system/org/tree",
        })
    }

    public static createOrganization(data: { requestBody: OrganizationCreate }): CancelablePromise<OrganizationPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/system/org/",
            body: data.requestBody,
            mediaType: "application/json",
        })
    }

    public static updateOrganization(data: { id: string; requestBody: OrganizationUpdate }): CancelablePromise<OrganizationPublic> {
        return __request(OpenAPI, {
            method: "PUT",
            url: `/api/v1/system/org/${data.id}`,
            body: data.requestBody,
            mediaType: "application/json",
        })
    }

    public static deleteOrganization(data: { id: string }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: `/api/v1/system/org/${data.id}`,
        })
    }
}

export class DictService {
    public static readTypes(data: { skip?: number; limit?: number } = {}): CancelablePromise<DictTypesPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/system/dict/types/",
            query: { skip: data.skip, limit: data.limit },
        })
    }

    public static readTypeWithItems(data: { id: string }): CancelablePromise<DictTypeWithItems> {
        return __request(OpenAPI, {
            method: "GET",
            url: `/api/v1/system/dict/types/${data.id}`,
        })
    }

    public static readTypeByCode(data: { code: string }): CancelablePromise<DictTypeWithItems> {
        return __request(OpenAPI, {
            method: "GET",
            url: `/api/v1/system/dict/by-code/${data.code}`,
        })
    }

    public static createType(data: { requestBody: DictTypeCreate }): CancelablePromise<DictTypePublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/system/dict/types/",
            body: data.requestBody,
            mediaType: "application/json",
        })
    }

    public static updateType(data: { id: string; requestBody: DictTypeUpdate }): CancelablePromise<DictTypePublic> {
        return __request(OpenAPI, {
            method: "PUT",
            url: `/api/v1/system/dict/types/${data.id}`,
            body: data.requestBody,
            mediaType: "application/json",
        })
    }

    public static deleteType(data: { id: string }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: `/api/v1/system/dict/types/${data.id}`,
        })
    }

    public static readItems(data: { type_id?: string; skip?: number; limit?: number } = {}): CancelablePromise<DictItemsPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/system/dict/items/",
            query: { type_id: data.type_id, skip: data.skip, limit: data.limit },
        })
    }

    public static createItem(data: { requestBody: DictItemCreate }): CancelablePromise<DictItemPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/system/dict/items/",
            body: data.requestBody,
            mediaType: "application/json",
        })
    }

    public static updateItem(data: { id: string; requestBody: DictItemUpdate }): CancelablePromise<DictItemPublic> {
        return __request(OpenAPI, {
            method: "PUT",
            url: `/api/v1/system/dict/items/${data.id}`,
            body: data.requestBody,
            mediaType: "application/json",
        })
    }

    public static deleteItem(data: { id: string }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: `/api/v1/system/dict/items/${data.id}`,
        })
    }
}

export class LogService {
    public static readLogs(data: { skip?: number; limit?: number; log_type?: string; level?: string; robot_code?: string } = {}): CancelablePromise<SystemLogsPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/system/logs/",
            query: { skip: data.skip, limit: data.limit, log_type: data.log_type, level: data.level, robot_code: data.robot_code },
        })
    }
}
