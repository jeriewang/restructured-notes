import {join} from "path";
import {tmpdir} from "os";
import {mkdirSync, rmdirSync, symlinkSync, writeFileSync} from "fs";
import {createNotebook, Notebook, NotebookConfig, openNotebook} from "src/common";
import expect from 'expect'


describe('notebook.spec.ts', () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(tmpdir(), 'test-rstnotes', 'test' + Math.random())
        mkdirSync(testDir, {recursive: true})
    })

    after(() => {
        rmdirSync(join(tmpdir(), 'test-rstnotes'), {recursive: true})
    })


    it("throws an error when creating a NotebookConfig without a name", () => {
        expect(() => {
            new NotebookConfig(testDir, true)
        })
            .toThrowError("The notebook's name must be defined during creation")
    })

    it("throws an error when loading broken notebook configuration", () => {
        writeFileSync(join(testDir, 'config.yml'), 'name: a\nuuid: a-b-c-d\n')
        let config = new NotebookConfig(testDir)
        expect(config.name).toBe('a')
        expect(config.uuid).toBe('a-b-c-d')

        writeFileSync(join(testDir, 'config.yml'), 'name: a\n')
        expect(() => {
            new NotebookConfig(testDir)
        }).toThrow(/invalid notebook configuration.*/gi)

        writeFileSync(join(testDir, 'config.yml'), 'uuid: 5\n')
        expect(() => {
            new NotebookConfig(testDir)
        }).toThrow(/invalid notebook configuration.*/gi)
    })


    it('creates notebook without a race condition', async () => {
        let notebook = await createNotebook('testNotebook', testDir)
        expect(notebook.repo).not.toBeUndefined()
        expect(notebook.initError).toBeUndefined()
        expect(notebook.initCompleted).toBeTruthy()
    })

    it('loads notebook correctly', async () => {
        const notebookName = 'testNotebook'
        await createNotebook(notebookName, testDir)
        let notebook = await openNotebook(testDir)
        expect(notebook.repo).not.toBeUndefined()
        expect(notebook.initError).toBeUndefined()
        expect(notebook.initCompleted).toBeTruthy()
        expect(notebook.config.name).toBe(notebookName)
        expect(notebook.config.uuid).not.toBeUndefined()
    })

    it('throws an error when opening a blank folder as notebook', async () => {
        await expect(openNotebook(testDir)).rejects.toThrow(/config\.yml/gi)
    })

    it('throws an error when opening a folder without git', async () => {
        writeFileSync(join(testDir, 'config.yml'), 'name: a\nuuid: a-b-c-d\n')
        await expect(openNotebook(testDir)).rejects.toThrow(/repository/gi)
    })

    it('throws an error loading notebook into a non-empty folder', async () => {
        writeFileSync(join(testDir, 'testFile'), '')
        await expect(createNotebook('testNotebook', testDir)).rejects.toThrow(/not empty/gi)
    })

    it('throws an error loading notebook into a file', async () => {
        const testFile = join(testDir, 'testFile')
        writeFileSync(testFile, '')
        await expect(createNotebook('testNotebook', testFile)).rejects.toThrow(/not a directory/gi)
    })

    it('throws an error loading notebook into a symlink', async () => {
        mkdirSync(join(testDir, 'test'))
        symlinkSync('./test', join(testDir, 'test2'))
        await expect(createNotebook('testNotebook', join(testDir, 'test2'))).rejects.toThrow(/a symlink/gi)
        expect((await createNotebook('testNotebook', join(testDir, 'test'))).initError).toBeUndefined()
    })
})