Vagrant.configure("2") do |config|
  # please see the online documentation at vagrantup.com.

  # Every Vagrant virtual environment requires a box to build off of.
  config.vm.box = "precise64"

  # provisioning script
  config.vm.provision "shell", path: "provision.sh"

  # Create a private network, which allows host-only access to the machine
  # using a specific IP.
  config.vm.network :public_network, ip: "192.168.1.10", bridge: "en1: Wi-Fi (AirPort)"
end
