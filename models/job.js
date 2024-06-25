"use strict";

const db = require('../db');
const { BadRequestError, NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');


class Job {
    /**Create a job from data, add to db, return new job data.
     * 
     * Data should be: {title, salary, equity, companyHandle}
     * 
     * Returns: {title, salary, equity, companyHandle}
     * 
     * Throws BadRequestError if job already exists
     */

    static async create({ title, salary, equity, companyHandle }) {
        const result = await db.query(`
        INSERT INTO jobs (title, salary, equity, company_handle)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [title, salary, equity, companyHandle])

        const job = result.rows[0]

        return job
    }

    /** Get all jobs or filtered jobs
     * 
     * Filter options through query strings: 
     * title, minSalary or hasEquity
     * 
     * Returns: [{title, salary, equity, company_handle}...]
     *
     */
    static async getAll(title = null, minSalary = null, hasEquity = null) {
        let minSalaryNum = +minSalary

        let sqlQuery = `SELECT title, salary, equity, company_handle 
                        FROM jobs`

        let filterValues = []
        let addToSqlQuery = []

        if (minSalaryNum !== 0) {
            filterValues.push(minSalary)
            addToSqlQuery.push(`salary >= $${filterValues.length}`)
        }

        if (hasEquity === 'true') {
            filterValues.push('0')
            addToSqlQuery.push(`equity > $${filterValues.length}`)
        }

        if (title !== null) {
            filterValues.push(title)
            addToSqlQuery.push(`title ILIKE '%'||$${filterValues.length}||'%'`)
        }

        if (filterValues.length > 0) {
            let stringWithAnd = addToSqlQuery.join(' AND ')
            sqlQuery += ` WHERE ` + stringWithAnd + ` ORDER BY title`
        }

        let result = await db.query(sqlQuery, filterValues)

        return result.rows
    }

    /** To get a single job's information when provided with the job's id.
     * 
     * Returns: {title, salary, equity, company_handle}
     * 
     * Throws NotFoundError if job is not found}
     */
    static async get(id) {

        const result = await db.query(`
        SELECT title, salary, equity, company_handle AS "companyHandle"
        FROM jobs
        WHERE id = $1`,
            [id])

        const job = result.rows[0]

        if (!job) throw new NotFoundError(`No job found with id of ${id}`)

        return job
    }

    /** Update job data with 'data'
   * This is a "partial update" --- it's fine if data doesn't contain all
   *  the fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
    */
    static async update(id, data) {

        const { cols, values } = sqlForPartialUpdate(
            data,
            {
                title: 'title',
                salary: 'salary',
                equity: 'equity'
            })

        const idVariableIdx = '$' + (values.length + 1)

        const sqlQuery = `UPDATE jobs
                          SET ${cols} 
                          WHERE id = ${idVariableIdx}  
                          RETURNING title, salary, equity, company_handle AS "companyHandle"`

        const result = await db.query(sqlQuery, [...values, id])

        const job = result.rows[0]

        if (!job) throw new NotFoundError(`No job found with id of ${id}`)

        return job
    }

    /**Delete a job
     * 
     * Requires: id
     * 
     * Returns undefined
     * 
     * If job not found, throw NotFoundError
     */
    static async remove(id) {
        const result = await db.query(`
        DELETE FROM jobs
        WHERE id = $1
        RETURNING id`,
            [id])

        const job = result.rows[0]

        if (!job) throw new NotFoundError(`No job found with id of ${id}`)
    }
}

module.exports = Job


