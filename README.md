# Taskground

<a href="https://assembly.com/taskground/bounties?utm_campaign=assemblage&utm_source=taskground&utm_medium=repo_badge"><img src="https://asm-badger.herokuapp.com/taskground/badges/tasks.svg" height="24px" alt="Open Tasks" /></a>

## Workforce management tool for mobile teams

This is a product being built by the Assembly community. You can help push this idea forward by visiting [https://assembly.com/taskground](https://assembly.com/taskground).

### How Assembly Works

Assembly products are like open-source and made with contributions from the community. Assembly handles the boring stuff like hosting, support, financing, legal, etc. Once the product launches we collect the revenue and split the profits amongst the contributors.

Visit [https://assembly.com](https://assembly.com) to learn more.

## Development

### Setting up a virtual machine with Vagrant

Download the Vagrantfile and provision.sh files from the git repository

1. Install [VirtualBox](https://www.virtualbox.org)
2. Install [Vagrant](http://www.vagrantup.com)
3. Add the precise64 box to Vagrant
    
        vagrant box add precise64 http://files.vagrantup.com/precise64.box

4. Start Vagrant
    
        vagrant up

5. ssh into the virtual machine

        vagrant ssh

The /vagrant folder is shared with the host

### Setting up the git repository

1. Set the git global settings

        git config --global user.name "Your Name"
        git config --global user.email you@example.com

2. Init the repository

        git init

3. Add the remote repository

        git remote add origin https://example.com

4. Copy the remote repository in your local one

        git fetch --all

        git reset --hard origin/master

### Downloading the application dependencies

The dependencies are managed with npm and are not added to the git repository. to install them just run npm install.

    npm install

### Starting the server

The first step is running the vagrant virtual machine:

    vagrant up

And the using ssh to log in to the virtual server:

    vagrant ssh

Once logged in, the project files will be in the /vagrant directory.

To start the server, by default it starts on port 3100:

    npm start


Tests can also be run using ntpm:

    npm test

#### Starting the server on production

The server in production is started using `forever`

    forever start taskground.js

To restart the server:

    forever restart #

Where # is the number of the forever task. To get a list of forever running tasks we can use the `list` option.

    forever list

#### Ngninx config

Nginx is used in front of taskground with this configuration:

    # the IP(s) on which your node server is running. I chose port 3000.
    upstream app_geographics {
        server 127.0.0.1:3100;
    }

    # the nginx server instance
    server {
        listen 0.0.0.0:80;
        server_name taskground.com;
        access_log /var/log/nginx/geographics.log;

        # pass the request to the node.js server with the correct headers and much more can be added, see nginx config options
        location / {
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header Host $http_host;
          proxy_set_header X-NginX-Proxy true;

          proxy_pass http://app_geographics/;
          proxy_redirect off;

          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
        }
     }

### Running the tests

We use Mocha to write our tests, to run them just use:

    npm test

This will run the tests in the test/ folder with mocha.

### App Modes

The application will run in development mode if the `development.lock` file exists, otherwise it will run in production mode.

### Taskground websockets protocol

* init markers - initialize tasks, users and settings
* settings - update current user data
* add user - add a new user
* edit user - edit an existing user
* delete user - delete an existing user
* add task - add a new task
* edit task - edit an existing task
* delete task - delete an existing task
* task done - mark a task as done
* task todo - mark a task as todo
* task pending - mark a task as pending

### Useful links

* [VirtualBox](https://www.virtualbox.org)
* [Vagrant](http://www.vagrantup.com)
* [BitBucket](https://bitbucket.org)
* [NodeJs](http://nodejs.org)
* [MongoDB](http://www.mongodb.org)
* [Express](http://expressjs.com)
* [Swig](http://paularmstrong.github.io/swig/)
* [Socket.io](http://socket.io)
* [Mocha](http://visionmedia.github.io/mocha/)