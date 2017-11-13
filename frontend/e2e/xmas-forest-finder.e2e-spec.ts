import { TreesForestFinderPage, TreesSidebarPage } from './app.po';
import { browser, element, by, Key, protractor } from 'protractor';


describe('Xmas tree  - Find a forest', () => {
  let page: TreesForestFinderPage;

  describe( 'text search', () => {
    beforeEach(() => {
      page = new TreesForestFinderPage();
      browser.driver.manage().window().setSize(1400, 900);
      page.navigateTo();
      browser.sleep(900);
    });

    it('should appear on the page', () => {
      expect<any>(element(by.id('forest-finder-input')).isPresent()).toBeTruthy();
    });

    it('should let the user enter a forest name and navigate to that forest', () => {
      element(by.id('forest-finder-input')).sendKeys('shoshone');
      browser.sleep(960);
      element(by.tagName('ng2-auto-complete')).click();
      element(by.id('forest-finder-submit')).click();
      browser.sleep(900);
      expect(browser.getCurrentUrl()).toEqual('http://localhost:4200/christmas-trees/forests/4/tree-guidelines');
    });

  });
});
