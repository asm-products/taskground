PROJECT_PATH = $(shell pwd)
JSDIR = $(PROJECT_PATH)/public/js
CSSDIR = $(PROJECT_PATH)/public/css
MOBILEJS = $(PROJECT_PATH)/public/js/mobile.min.js
OPERATORJS = $(PROJECT_PATH)/public/js/operator.min.js
HOMECSS = $(PROJECT_PATH)/public/css/home.min.css
OPERATORCSS = $(PROJECT_PATH)/public/css/operator.min.css
MOBILECSS = $(PROJECT_PATH)/public/css/mobile.min.css
ADMINCSS = $(PROJECT_PATH)/public/css/admin.min.css
JSMIN = uglifyjs
CSSMIN = cssmin

.PHONY: all clean contact minify

ALL: clean concat minify

concat: clean
	@echo "Concatenating mobile javascript files"
	@cat $(JSDIR)/common/jquery.js $(JSDIR)/common/map.js $(JSDIR)/common/template-engine.js $(JSDIR)/mobile/tasks.js $(JSDIR)/mobile/mobile.js >> $(MOBILEJS)
	@echo "Minimizing mobile javascript files"
	@$(JSMIN) $(MOBILEJS) -o $(MOBILEJS)
	@echo "Concatenating mobile javascript files"
	@cat $(JSDIR)/common/jquery.js $(JSDIR)/common/jquery-ui.custom.min.js $(JSDIR)/common/template-engine.js $(JSDIR)/common/map.js $(JSDIR)/operator/operator.js >> $(OPERATORJS)
	@echo "Minimizing operator javascript files"
	@$(JSMIN) $(OPERATORJS) -o $(OPERATORJS)

minify:
	@$(CSSMIN) $(CSSDIR)/home.css > $(HOMECSS)
	@cat $(CSSDIR)/font-awesome.min.css >> $(HOMECSS)
	@$(CSSMIN) $(CSSDIR)/operator.css > $(OPERATORCSS)
	@cat $(CSSDIR)/font-awesome.min.css >> $(OPERATORCSS)
	@$(CSSMIN) $(CSSDIR)/mobile.css > $(MOBILECSS)
	@cat $(CSSDIR)/font-awesome.min.css >> $(MOBILECSS)
	@$(CSSMIN) $(CSSDIR)/admin.css > $(ADMINCSS)
	@cat $(CSSDIR)/font-awesome.min.css >> $(ADMINCSS)

clean:
	@echo "Deleting minified files"
	@rm -f $(MOBILEJS) $(OPERATORJS)
